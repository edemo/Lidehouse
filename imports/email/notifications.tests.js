/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { chai, assert } from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';

import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/i18n/en.i18n.json';
import '/i18n/email.en.i18n.json';
import { processNotifications } from './notifications.js';

import { emailSender } from '/imports/startup/server/email-sender.js';   // We will be mocking it over

if (Meteor.isServer) {
  import '/imports/api/comments/methods.js';

  let Fixture;

  describe('notifications', function () {
    this.timeout(5000);
    let topicId;
    let demoCommunity;
    let demoUser;
    before(function () {
      // Fixture
      Fixture = freshFixture();
      demoCommunity = Communities.findOne(Fixture.demoCommunityId);
      demoUser = Meteor.users.findOne(Fixture.demoUserId);
      topicId = Topics.methods.insert._execute({ userId: Fixture.demoUserId }, { 
        communityId: Fixture.demoCommunityId,
        userId: Fixture.demoUserId,
        category: 'forum',
        title: 'New topic',
        text: 'This is the new topic',
      });
      Meteor.users.update(Fixture.demoUserId, { $set: { 'settings.notiFrequency': 'frequent' } });
    });
    beforeEach(function () {
      // Mocking the Email sending
      emailSender.sendHTML = sinon.spy();
      emailSender.sendPlainText = sinon.spy();
    });

    it('New users get all the past events in one bunch', function () {
      processNotifications('frequent');
      chai.assert(emailSender.sendHTML.calledOnce);
    });

    it('No email about your own comment', function () {
      Comments.methods.insert._execute({ userId: Fixture.demoUserId }, { userId: Fixture.demoUserId, topicId, text: 'Hello' });
      processNotifications('frequent');
      chai.assert(emailSender.sendHTML.notCalled);
    });

    it('Emails about other users comment', function () {
      Comments.methods.insert._execute({ userId: Fixture.dummyUsers[1] }, { userId: Fixture.dummyUsers[1], topicId, text: 'Hello' });
      processNotifications('frequent');
      chai.assert(emailSender.sendHTML.calledOnce);
      const emailOptions = emailSender.sendHTML.getCall(0).args[0];
      chai.assert.equal(emailOptions.to, demoUser.getPrimaryEmail());
      chai.assert.match(emailOptions.subject, /Updates/);
      chai.assert.equal(emailOptions.template, 'Notification_Email');
      chai.assert.equal(emailOptions.data.userId, demoUser._id);
      chai.assert.equal(emailOptions.data.communityId, demoCommunity._id);
      chai.assert.deepEqual(emailOptions.data.topics, Topics.find(topicId).fetch());
    });
  });
}
