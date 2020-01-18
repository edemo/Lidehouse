/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { chai, assert } from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import { moment } from 'meteor/momentjs:moment';

import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Partners } from '/imports/api/partners/partners.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/i18n/en.i18n.json';
import '/i18n/email.en.i18n.json';
import { processNotifications, notifyExpiringVotings, EXPIRY_NOTI_DAYS } from './notifications.js';
import { castVote } from '/imports/api/topics/votings/methods.js';

import { EmailSender } from '/imports/startup/server/email-sender.js';   // We will be mocking it over
import { Transactions } from '/imports/api/transactions/transactions.js';

if (Meteor.isServer) {
  import '/imports/api/comments/methods.js';

  let Fixture;

  describe('Notifications', function () {
    this.timeout(15000);
    let topicId;
    let ticketId;
    let demoCommunity;
    let demoManager;
    let ownerWithNotiFrequent;
    let ownerWithNotiDaily;
    let ownerWithNotiWeekly;
    let ownerWithRepresentorOnParcel;
    let ownerWithNotiNever;

    before(function () {
      // Fixture
      Fixture = freshFixture();
      demoCommunity = Communities.findOne(Fixture.demoCommunityId);
      demoManager = Meteor.users.findOne(Fixture.demoManagerId);
      Meteor.users.update(Fixture.demoUserId, { $set: { 'settings.notiFrequency': 'frequent' } });
      Meteor.users.update(Fixture.dummyUsers[3], { $set: { 'settings.notiFrequency': 'daily' } });
      Meteor.users.update(Fixture.dummyUsers[4], { $set: { 'settings.notiFrequency': 'daily' } });
      Meteor.users.update(Fixture.demoManagerId, { $set: { 'settings.notiFrequency': 'weekly' } });
      Meteor.users.update(Fixture.dummyUsers[2], { $set: { 'settings.notiFrequency': 'weekly' } });
      Meteor.users.update(Fixture.dummyUsers[5], { $set: { 'settings.notiFrequency': 'weekly' } });
      ownerWithNotiFrequent = Meteor.users.findOne(Fixture.demoUserId);
      ownerWithNotiDaily = Meteor.users.findOne(Fixture.dummyUsers[3]);
      ownerWithNotiWeekly = Meteor.users.findOne(Fixture.dummyUsers[2]);
      ownerWithRepresentorOnParcel = Meteor.users.findOne(Fixture.dummyUsers[5]);
      ownerWithNotiNever = Meteor.users.findOne(Fixture.dummyUsers[1]);
      // Mocking the Email sending
      sinon.stub(EmailSender);
    });
    afterEach(function () {
      sinon.resetHistory();
    });

    describe('Topic notifications', function () {
      before(function () {
        Topics.remove({});
        topicId = Fixture.builder.create('forum', { creatorId: ownerWithNotiFrequent._id });
        ticketId = Fixture.builder.create('issue', { creatorId: demoManager._id });
      });

      it('New users get all the past events in one bunch', function () {
        function assertGotAllEmails(user, emailData, count) {
          chai.assert.equal(emailData.to, user.getPrimaryEmail());
          chai.assert.match(emailData.subject, /Updates/);
          chai.assert.equal(emailData.template, 'Notification_Email');
          chai.assert.equal(emailData.data.userId, user._id);
          chai.assert.equal(emailData.data.communityId, demoCommunity._id);
          chai.assert.equal(emailData.data.topicsToDisplay.length, count);
        }

        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
        assertGotAllEmails(ownerWithNotiFrequent, EmailSender.send.getCall(0).args[0], 1);

        processNotifications('daily');
        sinon.assert.calledThrice(EmailSender.send);
        assertGotAllEmails(ownerWithNotiDaily, EmailSender.send.getCall(1).args[0], 2);
      });

      it('No emails after you seen it all', function () {
        processNotifications('frequent');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('daily');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('weekly');
        sinon.assert.calledThrice(EmailSender.send);
      });

      it('No email about your own comment', function () {
        Fixture.builder.create('comment', { topicId, creatorId: ownerWithNotiFrequent._id, text: 'Hello' });
        processNotifications('frequent');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('daily');
        sinon.assert.calledTwice(EmailSender.send);
      });

      it('Emails about other users comment', function () {
        Fixture.builder.create('comment', { topicId, creatorId: ownerWithNotiNever._id, text: 'Hello' });
        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
        const emailData = EmailSender.send.getCall(0).args[0];
        chai.assert.equal(emailData.template, 'Notification_Email');
        chai.assert.equal(emailData.data.userId, ownerWithNotiFrequent._id);
        chai.assert.equal(emailData.data.communityId, demoCommunity._id);
        chai.assert.equal(emailData.data.topicsToDisplay[0].topic._id, topicId);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments.length, 1);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments[0].text, 'Hello');
        processNotifications('daily');
        sinon.assert.calledThrice(EmailSender.send);
        processNotifications('weekly');
      });

      xit('Blanks out hidden comment', function () {
        // TODO? its only a UI thing now, so unable to test
      });

      it('Doesnt send email at all when there is only hidden comment', function () {
        Meteor.users.methods.flag._execute({ userId: Fixture.demoAdminId }, { id: ownerWithNotiNever._id });

        Fixture.builder.create('comment', { topicId, creatorId: ownerWithNotiNever._id, text: 'Hello again' });
        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.assert.notCalled(EmailSender.send);
      });

      it('Doesnt send email when former hidden comment is visible again', function () {
        Meteor.users.methods.flag._execute({ userId: Fixture.demoAdminId }, { id: ownerWithNotiNever._id }); // unflag above user

        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.assert.notCalled(EmailSender.send);
      });

      it('Doesnt email closed group content outside the group', function () {
        const privateTopicId = Fixture.builder.create('room', { creatorId: Fixture.demoManagerId, participantIds: [ownerWithNotiWeekly._id, Fixture.demoManagerId] });
        Fixture.builder.create('comment', { topicId: privateTopicId, creatorId: Fixture.demoManagerId, text: 'Hello buddy' });
        processNotifications('frequent');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('daily');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('weekly');
        sinon.assert.calledOnce(EmailSender.send);
      });

      // The private chat is now moderated (in email noti) by the moderators -- that's not too good, but OK for now, and can be viewed in the app
      xit('Private rooms are NOT moderated', function () {
        const moderatedUserId = ownerWithNotiNever._id; // we flagged him in a previous test (beware later we unflagged him)
        const privateTopicId = Fixture.builder.create('room', { creatorId: moderatedUserId, participantIds: [ownerWithNotiWeekly._id, moderatedUserId] });
        Fixture.builder.create('comment', { creatorId: moderatedUserId, topicId: privateTopicId, text: 'Hello buddy' });
        processNotifications('frequent');
        processNotifications('daily');
        sinon.assert.notCalled(EmailSender.send);
        processNotifications('weekly');
        sinon.assert.calledOnce(EmailSender.send);
      });

      it('Doesnt email other communites comment', function () {
        // TODO
      });

      it('Emails about new statusChange event', function () {
        const dataUpdate = { expectedFinish: moment().add(1, 'weeks').toDate() };
        Topics.methods.statusChange._execute({ userId: demoManager._id }, 
          { topicId: ticketId, status: 'confirmed', dataUpdate });
        processNotifications('daily');
        sinon.assert.calledTwice(EmailSender.send);
      });
    });

    describe('Vote expires notifications', function () {
      let userWhoHasVoted;

      before(function () {
        topicId = Fixture.builder.create('vote', { creatorId: ownerWithNotiFrequent._id, closesAt: moment().add(EXPIRY_NOTI_DAYS, 'day').toDate() });
        userWhoHasVoted = Meteor.users.findOne(Fixture.dummyUsers[4]);
        castVote._execute({ userId: userWhoHasVoted }, { topicId, castedVote: [2] });

        Fixture.builder.create('vote', { creatorId: Fixture.demoManagerId, closesAt: moment().add((EXPIRY_NOTI_DAYS - 1), 'day').toDate() });
        Fixture.builder.create('vote', { creatorId: Fixture.demoManagerId, closesAt: moment().add((EXPIRY_NOTI_DAYS + 1), 'day').toDate() });
      });

      it('Emails about vote closes soon', function () {
        notifyExpiringVotings();

        sinon.assert.calledThrice(EmailSender.send);
        const emailData = EmailSender.send.getCall(0).args[0];
        chai.assert.equal(emailData.template, 'Voteexpires_Email');
        chai.assert.equal(emailData.data.communityId, demoCommunity._id);
        chai.assert.equal(emailData.data.topics.length, 1);
        chai.assert.deepEqual(emailData.data.topics, Topics.find(topicId).fetch());

        sinon.assert.alwaysCalledWithMatch(EmailSender.send, { data: sinon.match({ communityId: demoCommunity._id }) });
        sinon.assert.calledWithMatch(EmailSender.send, { to: ownerWithNotiWeekly.getPrimaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { to: ownerWithNotiDaily.getPrimaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { to: ownerWithNotiFrequent.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(EmailSender.send, { to: userWhoHasVoted.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(EmailSender.send, { to: demoManager.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(EmailSender.send, { to: ownerWithRepresentorOnParcel.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(EmailSender.send, { to: ownerWithNotiNever.getPrimaryEmail() });
      });
    });

    describe('Vote confirmations', function () {
      it('Confirms legal votes', function () {
        const legalVoteId = Fixture.builder.create('vote', { creatorId: Fixture.demoManagerId, 'vote.effect': 'legal' });
        castVote._execute({ userId: ownerWithNotiFrequent._id }, { topicId: legalVoteId, castedVote: [2] });
        castVote._execute({ userId: ownerWithNotiNever._id }, { topicId: legalVoteId, castedVote: [2] });
        sinon.assert.calledTwice(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { to: ownerWithNotiFrequent.getPrimaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { to: ownerWithNotiNever.getPrimaryEmail() });
        sinon.assert.alwaysCalledWithMatch(EmailSender.send, { text: sinon.match(/vote has been registered/) });
      });
      it('Not confirms polls', function () {
        const pollVoteId = Fixture.builder.create('vote', { creatorId: Fixture.demoManagerId });
        castVote._execute({ userId: ownerWithNotiDaily._id }, { topicId: pollVoteId, castedVote: [2] });
        sinon.assert.notCalled(EmailSender.send);
      });
    });

    describe('Payment request emails', function () {
      let billId;
      let partnerId;

      it('Sends bill notification', function () {
        partnerId = Fixture.builder.create('supplier', { creatorId: Fixture.demoManagerId });
        const partner = Partners.findOne(partnerId);
        billId = Fixture.builder.create('bill', { creatorId: Fixture.demoManagerId, partnerId });
        sinon.assert.notCalled(EmailSender.send);
        Transactions.methods.post._execute({ userId: Fixture.demoManagerId }, { _id: billId });
        sinon.assert.calledOnce(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'BillNotification_Email' });
        sinon.assert.calledWithMatch(EmailSender.send, { to: partner.getPrimaryEmail() });
      });
      it('Sends outstanding notification', function () {
        /*Transactions.methods.post._execute({ userId: Fixture.demoManagerId }, { _id: billId });
        sinon.assert.calledOnce(EmailSender.send);
        const bill = Transactions.findOne(billId);
        const partner = Partners.findOne(bill.partnerId);
        sinon.assert.calledWithMatch(EmailSender.send, { to: partner.getPrimaryEmail() });*/
      });
    });
  });
}
