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
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/i18n/en.i18n.json';
import '/i18n/email.en.i18n.json';
import { processNotifications, notifyExpiringVotings, EXPIRY_NOTI_DAYS } from './notifications.js';
import { castVote } from '/imports/api/topics/votings/methods.js';

import { emailSender } from '/imports/startup/server/email-sender.js';   // We will be mocking it over

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
      sinon.stub(emailSender);
    });
    afterEach(function () {
      sinon.resetHistory();
    });

    describe('Topic notifications', function () {
      before(function () {
        topicId = Topics.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, {
          communityId: Fixture.demoCommunityId,
          category: 'forum',
          status: 'opened',
          title: 'New topic',
          text: 'This is the new topic',
        });
        ticketId = Topics.methods.insert._execute({ userId: demoManager._id },
          Fixture.builder.build('issue', { creatorId: demoManager._id })
        );
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
        sinon.assert.calledOnce(emailSender.sendHTML);
        assertGotAllEmails(ownerWithNotiFrequent, emailSender.sendHTML.getCall(0).args[0], 12);

        processNotifications('daily');
        sinon.assert.calledThrice(emailSender.sendHTML);
        assertGotAllEmails(ownerWithNotiDaily, emailSender.sendHTML.getCall(1).args[0], 11);
      });

      it('No emails after you seen it all', function () {
        processNotifications('frequent');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('daily');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('weekly');
        sinon.assert.calledThrice(emailSender.sendHTML);
      });

      it('No email about your own comment', function () {
        Comments.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, { creatorId: ownerWithNotiFrequent._id, topicId, text: 'Hello' });
        processNotifications('frequent');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('daily');
        sinon.assert.calledTwice(emailSender.sendHTML);
      });

      it('Emails about other users comment', function () {
        Comments.methods.insert._execute({ userId: ownerWithNotiNever._id }, { userId: ownerWithNotiNever._id, topicId, text: 'Hello' });
        processNotifications('frequent');
        sinon.assert.calledOnce(emailSender.sendHTML);
        const emailData = emailSender.sendHTML.getCall(0).args[0];
        chai.assert.equal(emailData.data.userId, ownerWithNotiFrequent._id);
        chai.assert.equal(emailData.data.communityId, demoCommunity._id);
        chai.assert.equal(emailData.data.topicsToDisplay[0].topic._id, topicId);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments.length, 1);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments[0].text, 'Hello');
        processNotifications('daily');
        sinon.assert.calledThrice(emailSender.sendHTML);
        processNotifications('weekly');
      });

      xit('Blanks out hidden comment', function () {
        // TODO? its only a UI thing now, so unable to test
      });

      it('Doesnt send email at all when there is only hidden comment', function () {
        Meteor.users.methods.flag._execute({ userId: Fixture.demoAdminId }, { id: ownerWithNotiNever._id });

        Comments.methods.insert._execute({ userId: ownerWithNotiNever._id }, { userId: ownerWithNotiNever._id, topicId, text: 'Hello again' });
        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.assert.notCalled(emailSender.sendHTML);
      });

      it('Doesnt send email when former hidden comment is visible again', function () {
        Meteor.users.methods.flag._execute({ userId: Fixture.demoAdminId }, { id: ownerWithNotiNever._id }); // unflag above user

        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.assert.notCalled(emailSender.sendHTML);
      });

      it('Doesnt email closed group content outside the group', function () {
        const privateTopicId = Topics.methods.insert._execute({ userId: Fixture.demoManagerId }, {
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoManagerId,
          participantIds: [ownerWithNotiWeekly._id, Fixture.demoManagerId],
          category: 'room',
          title: 'private chat',
          text: 'private chat',
          status: 'opened',
        });
        Comments.methods.insert._execute({ userId: Fixture.demoManagerId }, { userId: Fixture.demoManagerId, topicId: privateTopicId, text: 'Hello buddy' });
        processNotifications('frequent');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('daily');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('weekly');
        sinon.assert.calledOnce(emailSender.sendHTML);
      });

      // The private chat is now modetrated (in email noti) by the moderators -- that's not too good, but OK for now, and can be viewed in the app
      xit('Private rooms are NOT moderated', function () {
        const moderatedUserId = ownerWithNotiNever._id; // we flagged him in a previous test
        const privateTopicId = Topics.methods.insert._execute({ userId: moderatedUserId }, {
          communityId: Fixture.demoCommunityId,
          userId: moderatedUserId,
          participantIds: [ownerWithNotiWeekly._id, moderatedUserId],
          category: 'room',
          title: 'private chat',
          text: 'private chat',
          status: 'opened',
        });
        Comments.methods.insert._execute({ userId: moderatedUserId }, { userId: moderatedUserId, topicId: privateTopicId, text: 'Hello buddy' });
        processNotifications('frequent');
        processNotifications('daily');
        sinon.assert.notCalled(emailSender.sendHTML);
        processNotifications('weekly');
        sinon.assert.calledOnce(emailSender.sendHTML);
      });

      it('Doesnt email other communites comment', function () {
        // TODO
      });

      it('Emails about new statusChange event', function () {
        const dataUpdate = { expectedFinish: moment().add(1, 'weeks').toDate() };
        Topics.methods.statusChange._execute({ userId: demoManager._id }, 
          { topicId: ticketId, status: 'confirmed', dataUpdate });
        processNotifications('daily');
        sinon.assert.calledTwice(emailSender.sendHTML);
      });
    });

    describe('Vote expires notifications', function () {
      let userWhoHasVoted;

      before(function () {
        topicId = Topics.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, {
          communityId: Fixture.demoCommunityId,
          category: 'vote',
          title: 'New voting',
          text: 'This is the new voting',
          status: 'opened',
          closesAt: moment().add(EXPIRY_NOTI_DAYS, 'day').toDate(),
          vote: {
            procedure: 'online',
            effect: 'poll',
            type: 'yesno',
          },
        });

        castVote._execute({ userId: Fixture.dummyUsers[4] }, { topicId, castedVote: [2] });
        userWhoHasVoted = Meteor.users.findOne(Fixture.dummyUsers[4]);

        Topics.methods.insert._execute({ userId: Fixture.demoManagerId }, {
          communityId: Fixture.demoCommunityId,
          category: 'vote',
          title: 'Earlier voting',
          text: 'This voting expired already',
          status: 'opened',
          closesAt: moment().add((EXPIRY_NOTI_DAYS - 1), 'day').toDate(),
          vote: {
            procedure: 'online',
            effect: 'poll',
            type: 'yesno',
          },
        });
        Topics.methods.insert._execute({ userId: Fixture.demoManagerId }, {
          communityId: Fixture.demoCommunityId,
          category: 'vote',
          title: 'Later voting',
          text: 'This voting will expire later',
          status: 'opened',
          closesAt: moment().add((EXPIRY_NOTI_DAYS + 1), 'day').toDate(),
          vote: {
            procedure: 'online',
            effect: 'poll',
            type: 'yesno',
          },
        });
      });

      it('Emails about vote closes soon', function () {
        notifyExpiringVotings();

        sinon.assert.calledThrice(emailSender.sendHTML);
        const emailData = emailSender.sendHTML.getCall(0).args[0];
        chai.assert.equal(emailData.template, 'Voteexpires_Email');
        chai.assert.equal(emailData.data.communityId, demoCommunity._id);
        chai.assert.equal(emailData.data.topics.length, 1);
        chai.assert.deepEqual(emailData.data.topics, Topics.find(topicId).fetch());

        sinon.assert.alwaysCalledWithMatch(emailSender.sendHTML, { data: sinon.match({ communityId: demoCommunity._id }) });
        sinon.assert.calledWithMatch(emailSender.sendHTML, { to: ownerWithNotiWeekly.getPrimaryEmail() });
        sinon.assert.calledWithMatch(emailSender.sendHTML, { to: ownerWithNotiDaily.getPrimaryEmail() });
        sinon.assert.calledWithMatch(emailSender.sendHTML, { to: ownerWithNotiFrequent.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(emailSender.sendHTML, { to: userWhoHasVoted.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(emailSender.sendHTML, { to: demoManager.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(emailSender.sendHTML, { to: ownerWithRepresentorOnParcel.getPrimaryEmail() });
        sinon.assert.neverCalledWithMatch(emailSender.sendHTML, { to: ownerWithNotiNever.getPrimaryEmail() });
      });
    });
  });
}
