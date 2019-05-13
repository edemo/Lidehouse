/* eslint-env mocha */

import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { DDP } from 'meteor/ddp-client';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { assert } from 'meteor/practicalmeteor:chai';
import { Promise } from 'meteor/promise';
import { $ } from 'meteor/jquery';

import { denodeify } from '../../utils/denodeify';
import { generateData } from './../../api/generate-data.app-tests.js';
import { Topics } from '../../api/topics/topics.js';
import { Comments } from '../../api/comments/comments.js';


// Utility -- returns a promise which resolves when all subscriptions are done
const waitForSubscriptions = () => new Promise((resolve) => {
  const poll = Meteor.setInterval(() => {
    if (DDP._allSubscriptionsReady()) {
      Meteor.clearInterval(poll);
      resolve();
    }
  }, 200);
});

// Tracker.afterFlush runs code when all consequent of a tracker based change
//   (such as a route change) have occured. This makes it a promise.
const afterFlushPromise = denodeify(Tracker.afterFlush);

if (Meteor.isClient) {
  describe('data available when routed', () => {
    // First, ensure the data that we expect is loaded on the server
    //   Then, route the app to the homepage
    beforeEach(() =>
      generateData()
        .then(() => FlowRouter.go('/'))
        .then(waitForSubscriptions));

    describe('when logged out', () => {
      it('has all public topics at homepage', () => {
        assert.equal(Topics.find().count(), 3);
      });

      it('renders the correct topic when routed to', () => {
        const topic = Topics.findOne();
        FlowRouter.go('Topic show', { _id: topic._id });

        return afterFlushPromise()
          .then(waitForSubscriptions)
          .then(() => {
            assert.equal($('.title-wrapper').html(), topic.title);
            assert.equal(Comments.find({ topicId: topic._id }).count(), 3);
          });
      });
    });
  });
}
