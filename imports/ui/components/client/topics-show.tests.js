/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { chai } from 'meteor/practicalmeteor:chai';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { withRenderedTemplate } from '../../test-helpers.js';
import '../topics-show.js';
import { Comments } from '../../../api/comments/comments.js';


describe('Topics_show', function () {
  beforeEach(function () {
    Template.registerHelper('_', key => key);
  });

  afterEach(function () {
    Template.deregisterHelper('_');
  });

  it('renders correctly with simple data', function () {
    const topic = Factory.build('topic');
    const timestamp = new Date();

    // Create a local collection in order to get a cursor
    // Note that we need to pass the transform in so the documents look right when they come out.
    const commentsCollection = new Mongo.Collection(null, { transform: Comments._transform });
    _.times(3, (i) => {
      const comment = Factory.build('comment', {
        topicId: topic._id,
        createdAt: new Date(timestamp - (3 - i)),
      });
      commentsCollection.insert(comment);
    });
    const commentsCursor = commentsCollection.find({}, { sort: { createdAt: -1 } });

    const data = {
      topic: () => topic,
      commentsReady: true,
      comments: commentsCursor,
    };

    withRenderedTemplate('Topics_show', data, (el) => {
      const commentsText = commentsCursor.map(t => t.text);
      const renderedText = $(el).find('.topic-items input[type=text]')
        .map((i, e) => $(e).val())
        .toArray();
      chai.assert.deepEqual(renderedText, commentsText);
    });
  });
});
