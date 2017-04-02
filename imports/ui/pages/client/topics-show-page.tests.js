/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { Random } from 'meteor/random';
import { chai } from 'meteor/practicalmeteor:chai';
import StubCollections from 'meteor/hwillson:stub-collections';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { sinon } from 'meteor/practicalmeteor:sinon';


import { withRenderedTemplate } from '../../test-helpers.js';
import '../topics-show-page.js';

import { Comments } from '../../../api/comments/comments.js';
import { Topics } from '../../../api/topics/topics.js';

describe('Topics_show_page', function () {
  const topicId = Random.id();

  beforeEach(function () {
    StubCollections.stub([Comments, Topics]);
    Template.registerHelper('_', key => key);
    sinon.stub(FlowRouter, 'getParam', () => topicId);
    sinon.stub(Meteor, 'subscribe', () => ({
      subscriptionId: 0,
      ready: () => true,
    }));
  });

  afterEach(function () {
    StubCollections.restore();
    Template.deregisterHelper('_');
    FlowRouter.getParam.restore();
    Meteor.subscribe.restore();
  });

  it('renders correctly with simple data', function () {
    Factory.create('topic', { _id: topicId });
    const timestamp = new Date();
    const comments = _.times(3, i => Factory.create('comment', {
      topicId,
      createdAt: new Date(timestamp - (3 - i)),
    }));

    withRenderedTemplate('Topics_show_page', {}, (el) => {
      const commentsText = comments.map(t => t.text).reverse();
      const renderedText = $(el).find('.topic-items input[type=text]')
        .map((i, e) => $(e).val())
        .toArray();
      chai.assert.deepEqual(renderedText, commentsText);
    });
  });
});
