import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '../../api/topics/topics.js';

import { topicRenderHold } from '../launch-screen.js';
import './topics-show-page.html';

// Components used inside the template
import './app-not-found.js';
import '../components/topics-show.js';

Template.Topics_show_page.onCreated(function topicsShowPageOnCreated() {
  this.getTopicId = () => FlowRouter.getParam('_tid');

  this.autorun(() => {
    this.subscribe('comments.inTopic', { topicId: this.getTopicId() });
  });
});

Template.Topics_show_page.onRendered(function topicsShowPageOnRendered() {
  this.autorun(() => {
    if (this.subscriptionsReady()) {
      topicRenderHold.release();
    }
  });
});

Template.Topics_show_page.helpers({
  // We use #each on an array of one item so that the "topic" template is
  // removed and a new copy is added when changing topics, which is
  // important for animation purposes.
  topicIdArray() {
    const instance = Template.instance();
    const topicId = instance.getTopicId();
    return Topics.findOne(topicId) ? [topicId] : [];
  },
  topicArgs(topicId) {
    const instance = Template.instance();
    // By finding the topic with only the `_id` field set, we don't create a dependency on the
    // `topic.unreadCount`, and avoid re-rendering the comments when it changes
    const topic = Topics.findOne(topicId, { fields: { _id: true } });
    const comments = topic && topic.comments();
    return {
      commentsReady: instance.subscriptionsReady(),
      // We pass `topic` (which contains the full topic, with all fields, as a function
      // because we want to control reactivity. When you check a comment item, the
      // `topic.unreadCount` changes. If we didn't do this the entire topic would
      // re-render whenever you checked an item. By isolating the reactiviy on the topic
      // to the area that cares about it, we stop it from happening.
      topic() {
        return Topics.findOne(topicId);
      },
      comments,
    };
  },
});
