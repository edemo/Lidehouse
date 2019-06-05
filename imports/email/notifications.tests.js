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
import { processNotifications, sendVoteexpiresNoti, EXPIRY_NOTI_DAYS } from './notifications.js';
import { castVote } from '/imports/api/topics/votings/methods.js';

import { emailSender } from '/imports/startup/server/email-sender.js';   // We will be mocking it over

if (Meteor.isServer) {
  import '/imports/api/comments/methods.js';

  let Fixture;

  describe('EmailSender calling', function () {
    this.timeout(5000);
    let topicId;
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
    });
    beforeEach(function () {
      // Mocking the Email sending
      emailSender.sendHTML = sinon.spy();
      emailSender.sendPlainText = sinon.spy();
    });

    describe('notifications', function () {   
      before(function () {
        topicId = Topics.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, { 
          communityId: Fixture.demoCommunityId,
          userId: ownerWithNotiFrequent._id,
          category: 'forum',
          title: 'New topic',
          text: 'This is the new topic',
        });
      });
     
      it('New users get all the past events in one bunch', function () {
        processNotifications('frequent');
        chai.assert(emailSender.sendHTML.calledOnce);
      });

      it('No email about your own comment', function () {
        Comments.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, { userId: ownerWithNotiFrequent._id, topicId, text: 'Hello' });
        processNotifications('frequent');
        chai.assert(emailSender.sendHTML.notCalled);
      });

      it('Emails about other users comment', function () {
        Comments.methods.insert._execute({ userId: Fixture.dummyUsers[1] }, { userId: Fixture.dummyUsers[1], topicId, text: 'Hello' });
        processNotifications('frequent');
        chai.assert(emailSender.sendHTML.calledOnce);
        const emailOptions = emailSender.sendHTML.getCall(0).args[0];
        chai.assert.equal(emailOptions.to, ownerWithNotiFrequent.getPrimaryEmail());
        chai.assert.match(emailOptions.subject, /Updates/);
        chai.assert.equal(emailOptions.template, 'Notification_Email');
        chai.assert.equal(emailOptions.data.userId, ownerWithNotiFrequent._id);
        chai.assert.equal(emailOptions.data.communityId, demoCommunity._id);
        chai.assert.deepEqual(emailOptions.data.topics, Topics.find(topicId).fetch());
      });
    });

    describe('Vote expires notification', function () {
      before(function () {
        topicId = Topics.methods.insert._execute({ userId: ownerWithNotiFrequent._id }, { 
          communityId: Fixture.demoCommunityId,
          userId: ownerWithNotiFrequent._id,
          category: 'vote',
          title: 'New voting',
          text: 'This is the new voting',
          vote: {
            closesAt: moment().add(EXPIRY_NOTI_DAYS, 'day').toDate(),
            procedure: 'online',
            effect: 'poll',
            type: 'yesno',
          },
        });
        castVote._execute({ userId: Fixture.dummyUsers[4] }, { topicId, castedVote: [2] });
        Topics.methods.insert._execute({ userId: Fixture.demoManagerId }, { 
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoManagerId,
          category: 'vote',
          title: 'Later voting',
          text: 'This is an other voting',
          vote: {
            closesAt: moment().add((EXPIRY_NOTI_DAYS + 7), 'day').toDate(),
            procedure: 'online',
            effect: 'poll',
            type: 'yesno',
          },
        });
      });

      it('Emails about vote closes soon', function () {
        const userWhoHasVoted = Meteor.users.findOne(Fixture.dummyUsers[4]);
        sendVoteexpiresNoti();
        chai.assert.equal(emailSender.sendHTML.callCount, 3);
        const emailOptions = emailSender.sendHTML.getCall(0).args[0];
        chai.assert.equal(emailOptions.template, 'Voteexpires_Email');
        chai.assert.equal(emailOptions.data.communityId, demoCommunity._id);
        chai.assert.equal(emailOptions.data.topics.length, 1);
        chai.assert.deepEqual(emailOptions.data.topics, Topics.find(topicId).fetch());
        chai.assert(emailSender.sendHTML.calledWithMatch({ to: ownerWithNotiWeekly.getPrimaryEmail() }));
        chai.assert(emailSender.sendHTML.calledWithMatch({ to: ownerWithNotiDaily.getPrimaryEmail() }));
        chai.assert(emailSender.sendHTML.calledWithMatch({ to: ownerWithNotiFrequent.getPrimaryEmail() }));
        chai.assert(emailSender.sendHTML.neverCalledWithMatch({ to: userWhoHasVoted.getPrimaryEmail() }));
        chai.assert(emailSender.sendHTML.neverCalledWithMatch({ to: demoManager.getPrimaryEmail() }));          
        chai.assert(emailSender.sendHTML.neverCalledWithMatch({ to: ownerWithRepresentorOnParcel.getPrimaryEmail() }));
        chai.assert(emailSender.sendHTML.neverCalledWithMatch({ to: ownerWithNotiNever.getPrimaryEmail() }));
      });
    });
  });
}
