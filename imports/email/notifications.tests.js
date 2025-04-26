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
import { Contracts } from '/imports/api/contracts/contracts.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/i18n/en.i18n.json';
import '/i18n/email.en.i18n.json';
import { processNotifications, notifyExpiringVotings, EXPIRY_NOTI_DAYS } from './notifications-send.js';
import { castVote } from '/imports/api/topics/votings/methods.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

import { EmailSender } from '/imports/startup/server/email-sender.js';   // We will be mocking it over
import { Transactions } from '/imports/api/transactions/transactions.js';

if (Meteor.isServer) {
  import '/imports/api/comments/methods.js';

  let Fixture;

  describe('Notifications', function () {
    this.timeout(150000);
    let topicId;
    let ticketId;
    let assertGotAllEmails;
    let demoCommunity;
    let demoAdmin, demoManager, demoMaintainer;
    let ownerWithNotiFrequent;
    let ownerWithNotiDaily;
    let ownerWithNotiWeekly;
    let ownerWithRepresentorOnParcel;
    let ownerWithNotiNever;
    let ticketHandlers;

    before(function () {
      // Fixture
      Fixture = freshFixture();
      Communities.update(Fixture.demoCommunityId, { $set: { 'settings.sendBillEmail': ['member'] } });
      Contracts.remove({ parcelId: Fixture.dummyParcels[1] }); // No need for leadParcel for dummyUsers[1] as he needs own votership
      demoCommunity = Communities.findOne(Fixture.demoCommunityId);
      demoAdmin = Meteor.users.findOne(Fixture.demoAdminId);
      demoManager = Meteor.users.findOne(Fixture.demoManagerId);
      demoMaintainer = Meteor.users.findOne(Fixture.dummyUsers[0]);
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
      ticketHandlers = demoCommunity.ticketHandlers();
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
        ticketId = Fixture.builder.create('issue', { creatorId: demoManager._id, 'ticket.localizer': '@' });
        assertGotAllEmails = function (user, emailData, count) {
          chai.assert.equal(emailData.to, user.getPrimaryEmail());
          chai.assert.match(emailData.subject, /Updates/);
//          chai.assert.equal(emailData.template.substring(-22), 'Notifications_Email'); or Immediate_Notifications_Email
          chai.assert.equal(emailData.data.user._id, user._id);
          chai.assert.equal(emailData.data.community._id, demoCommunity._id);
          chai.assert.equal(emailData.data.topicsToDisplay.length, count);
        }
      });

      it('New users get all the past events in one bunch', function () {
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
        chai.assert.equal(emailData.template, 'Notifications_Email');
        chai.assert.equal(emailData.data.user._id, ownerWithNotiFrequent._id);
        chai.assert.equal(emailData.data.community._id, demoCommunity._id);
        chai.assert.equal(emailData.data.topicsToDisplay.length, 1);
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

      it('Tickethandlers get noti email, immediately', function () {
        chai.assert.equal(ticketHandlers.length, 3);

        const urgentTicketId = Fixture.builder.create('issue', { creatorId: Fixture.demoManagerId, 'ticket.localizer': '@', 'ticket.urgency': 'high' });
        sinon.assert.calledTwice(EmailSender.send);
        assertGotAllEmails(demoAdmin, EmailSender.send.getCall(0).args[0], 1);
        assertGotAllEmails(demoMaintainer, EmailSender.send.getCall(1).args[0], 1);
//        assertGotAllEmails(demoManager, EmailSender.send.getCall(2).args[0], 1); // He created it
        sinon.resetHistory();

        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
        processNotifications('daily');
        sinon.assert.calledThrice(EmailSender.send);
        processNotifications('weekly');
      });

      it('Immediate notification on news topics', function () {
        chai.assert.equal(demoCommunity.users().length, 11);

        const urgentNewsId = Fixture.builder.create('news', { creatorId: Fixture.demoManagerId, 'notiUrgency': 'immediate' });
        chai.assert.equal(EmailSender.send.callCount, 10);
        sinon.resetHistory();

        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.assert.notCalled(EmailSender.send);

        const normalNewsId = Fixture.builder.create('news', { creatorId: Fixture.demoManagerId, 'notiUrgency': 'normal' });
        sinon.assert.notCalled(EmailSender.send);

        processNotifications('frequent');
        processNotifications('daily');
        processNotifications('weekly');
        sinon.resetHistory();
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
        const dataUpdate = {
          // no localizer, so everyone gets notified
          expectedFinish: moment().add(1, 'weeks').toDate(),
        };
        Topics.methods.statusChange._execute({ userId: demoManager._id }, { topicId: ticketId, status: 'confirmed', dataUpdate });
        processNotifications('daily');
        sinon.assert.calledTwice(EmailSender.send);
      });

      it('Emails only users at the ticket location', function () {
        const localizer = '@A103';  // So this will be relevant to dummyUser3 but not to dummyUser4
        Topics.methods.update._execute({ userId: demoManager._id }, { _id: ticketId, modifier: { $set: { 'ticket.localizer': localizer } } });
        Fixture.builder.create('comment', { topicId: ticketId, creatorId: ownerWithNotiNever._id, text: 'Update' });
        processNotifications('daily');
        sinon.assert.calledOnce(EmailSender.send);
      });

      it('Emails only users within the ticket location', function () {
        const localizer = '@A1';  // So this will be relevant to the whole first floor
        Topics.methods.update._execute({ userId: demoManager._id }, { _id: ticketId, modifier: { $set: { 'ticket.localizer': localizer } } });
        Fixture.builder.create('comment', { topicId: ticketId, creatorId: ownerWithNotiNever._id, text: 'Update' });
        processNotifications('daily');
        sinon.assert.calledTwice(EmailSender.send);
      });
    });

    describe('Moving comment/topic', function () {
      let otherTopicId;
      it('Doesnt send email when seen comments are moved to other topic', function () {
        processNotifications('frequent');
        sinon.resetHistory();
        otherTopicId = Fixture.builder.create('forum', { creatorId: ownerWithNotiFrequent._id });
        const commentId = Fixture.builder.create('comment', { topicId: otherTopicId, creatorId: ownerWithNotiNever._id, text: 'New hello' });
        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
        const emailData = EmailSender.send.getCall(0).args[0];
        chai.assert.equal(emailData.data.user._id, ownerWithNotiFrequent._id);
        chai.assert.equal(emailData.data.topicsToDisplay.length, 1);
        chai.assert.equal(emailData.data.topicsToDisplay[0].topic._id, otherTopicId);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments.length, 1);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments[0].text, 'New hello');
        Comments.methods.move._execute({ userId: Fixture.demoAdminId }, { _id: commentId, destinationId: topicId });
        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
      });
      it('Sends email when there is unseen comment on destination topic', function () {
        const commentId = Fixture.builder.create('comment', { topicId, creatorId: ownerWithNotiNever._id, text: 'Next comment' });
        const movingCommentId = Fixture.builder.create('comment', { topicId: otherTopicId, creatorId: ownerWithNotiNever._id, text: 'Moving comment' });
        updateMyLastSeen._execute({ userId: ownerWithNotiFrequent._id }, { topicId: otherTopicId, lastSeenInfo: { timestamp: new Date() } });
        Comments.methods.move._execute({ userId: Fixture.demoAdminId }, { _id: movingCommentId, destinationId: topicId });
        processNotifications('frequent');
        sinon.assert.calledOnce(EmailSender.send);
        const emailData = EmailSender.send.getCall(0).args[0];
        chai.assert.equal(emailData.data.user._id, ownerWithNotiFrequent._id);
        chai.assert.equal(emailData.data.topicsToDisplay.length, 1);
        chai.assert.equal(emailData.data.topicsToDisplay[0].topic._id, topicId);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments.length, 2);
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments[0].text, 'Next comment');
        chai.assert.equal(emailData.data.topicsToDisplay[0].unseenComments[1].text, 'Moving comment');
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
        chai.assert.equal(emailData.template, 'Vote_closes_Email');
        chai.assert.equal(emailData.data.community._id, demoCommunity._id);
        chai.assert.equal(emailData.data.topics.length, 1);
        chai.assert.deepEqual(emailData.data.topics, Topics.find(topicId).fetch());

        sinon.assert.alwaysCalledWithMatch(EmailSender.send, { data: sinon.match({ community: demoCommunity }) });
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
      let partner2Id;

      before(function () {
        partnerId = Fixture.builder.create('member', { creatorId: Fixture.demoManagerId });
        partner2Id = Fixture.builder.create('customer', { creatorId: Fixture.demoManagerId });
      });

      it('Sends new bill', function () {
        const partner = Partners.findOne(partnerId);
        billId = Fixture.builder.create('bill', {
          creatorId: Fixture.demoManagerId,
          partnerId,
          relation: 'member',
          relationAccount: '`33',
        });
        const customerBillId = Fixture.builder.create('bill', {
          creatorId: Fixture.demoManagerId,
          partnerId: partner2Id,
          relation: 'customer',
          relationAccount: '`31',
        });
        const bill = Transactions.findOne(billId);
        const customerBill = Transactions.findOne(customerBillId);
        sinon.assert.notCalled(EmailSender.send);

        Transactions.methods.post._execute({ userId: Fixture.demoManagerId }, { _id: customerBillId });
        chai.assert.isUndefined(bill.contractId);   // member bills do not get default contract created
        sinon.assert.notCalled(EmailSender.send);
        Transactions.methods.post._execute({ userId: Fixture.demoManagerId }, { _id: billId });
        chai.assert.isDefined(customerBill.contractId);
        sinon.assert.calledOnce(EmailSender.send);    // customer bills get default contract created for them
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'Bill_Email' });
        sinon.assert.calledWithMatch(EmailSender.send, { to: partner.primaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { data: sinon.match({ user: partner.user(), community: bill.community(), bill }) });
      });

      it('Sends bill to contract delegatee (payer partner)', function () {
        const partner = Partners.findOne(partnerId);
        const contractId = Fixture.builder.create('memberContract', { partnerId, cc: [{ partnerId: partner2Id }] });
        const contract = Contracts.findOne(contractId);
        Transactions.update(billId, { $set: { contractId } }, { selector: { category: 'bill' } });
        const bill = Transactions.findOne(billId);
        const partner2 = Partners.findOne(partner2Id);
        chai.assert.deepEqual(contract.emailsToNotify(),  { to: partner.primaryEmail(), cc: [partner2.primaryEmail()] });
        sinon.assert.notCalled(EmailSender.send);

        Transactions.methods.resend._execute({ userId: Fixture.demoManagerId }, { _id: billId });
        sinon.assert.calledOnce(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'Bill_Email' });
        sinon.assert.calledWithMatch(EmailSender.send, { to: partner.primaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { cc: [partner2.primaryEmail()] });
        sinon.assert.calledWithMatch(EmailSender.send, { data: sinon.match({ community: bill.community(), bill }) });
      });

      it('Sends outstandings reminder', function () {
        const partner = Partners.findOne(partnerId);
        const partner2 = Partners.findOne(partner2Id);
        const bill = Transactions.findOne(billId);
        const contract = bill.contract();
        chai.assert.isDefined(contract);
        sinon.assert.notCalled(EmailSender.send);
  
        Contracts.methods.remindOutstandings._execute({ userId: Fixture.demoManagerId }, { _id: contract._id });
        sinon.assert.calledOnce(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'Outstandings_Email' });
        sinon.assert.calledWithMatch(EmailSender.send, { to: partner.primaryEmail() });
        sinon.assert.calledWithMatch(EmailSender.send, { cc: [partner2.primaryEmail()] });
        sinon.assert.calledWithMatch(EmailSender.send, { data: sinon.match({ community: bill.community(), contract }) });
      });

      it('Doesnt send bill to suppliers', function () {
        partnerId = Fixture.builder.create('supplier', { creatorId: Fixture.demoManagerId });
        billId = Fixture.builder.create('bill', {
          creatorId: Fixture.demoManagerId,
          partnerId,
          relation: 'supplier',
          relationAccount: '`454',
        });

        Transactions.methods.post._execute({ userId: Fixture.demoManagerId }, { _id: billId });
        sinon.assert.notCalled(EmailSender.send);
      });
    });

    describe('Community launch promo email', function () {
      let community;
      let admin;
      let promoCode;

      it('Sends email to launch (activate) community from promo', function () {
        community = {
          name: 'Promo house',
          settings: {
            language: 'hu',
            ownershipScheme: 'condominium',
          },
        };
        admin = { email: 'promoAdmin@promoemail.hu', language: 'hu' };
        const parcelCount = 100;
        promoCode = 'covid';

        Meteor.call('communities.launchMail', { community, admin, parcelCount, promoCode });
        sinon.assert.calledOnce(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { to: admin.email });
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'Promo_Launch_Link' });
        sinon.assert.calledWithMatch(EmailSender.send, { data: sinon.match({ community: { name: 'Promo house' }, promoCode: 'covid' }) });
      });

      it('Sends promo invitation link in email when launching community from promo', function () {
        _.extend(community, {
          status: 'sandbox',
          city: '?-város',
          street: '?-utca',
          number: '?-szám',
          zip: '1111',
          lot: '?-hrsz',
          settings: {
            language: 'hu',
            ownershipScheme: 'condominium',
            totalUnits: 10000,
            templateId: Communities.findOne({ name: 'Honline Társasház Sablon', isTemplate: true })._id,
            accountingMethod: 'cash',
          },
        });
        Communities.methods.launch._execute({}, { community, admin, promoCode });
        sinon.assert.calledOnce(EmailSender.send);
        sinon.assert.calledWithMatch(EmailSender.send, { to: admin.email });
        sinon.assert.calledWithMatch(EmailSender.send, { template: 'Promo_Invite_Link' });
        sinon.assert.calledWithMatch(EmailSender.send, { data: sinon.match({ community }) });
      });
    });
  });
}
