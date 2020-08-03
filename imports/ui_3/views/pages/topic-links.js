import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { __ } from '/imports/localization/i18n.js';

import './topic-links.html';

Template.Topic_links.viewmodel({
  thisTopic() {
    const topic = Topics.findOne(FlowRouter.getParam('_tid'));
    return topic;
  },
  pointThisTopicIdArray() {
    const topicId = this.thisTopic()._id;
    const pointAtThisTopic = Comments.find({ type: 'pointAt', 'data.pointAt': topicId });
    const topicIdArray = [];
    pointAtThisTopic.forEach(comment => {
      const topic = Topics.findOne(comment.topicId);
      if (!topicIdArray.includes(topic._id)) topicIdArray.push(topic._id);
    });
    return topicIdArray;
  },
  topic(topicId) {
    const topic = Topics.findOne(topicId);
    return topic;
  },
  pointOtherTopicIdArray() {
    const topicId = this.thisTopic()._id;
    const pointAtThisTopic = Comments.find({ topicId, type: 'pointAt' });
    const topicIdArray = [];
    pointAtThisTopic.forEach(comment => {
      const topic = Topics.findOne({ _id: comment.data.pointAt });
      if (!topicIdArray.includes(topic._id)) topicIdArray.push(topic._id);
    });
    return topicIdArray;
  },
  pageTitle() {
    return __('topic.' + this.thisTopic().category) + ' ' + __('details');
  },
  smallTitle() {
    return this.thisTopic().title;
  },
  pageCrumbs() {
    switch (this.thisTopic().category) {
      case 'vote': {
        return [{
          title: __('Votings'),
          url: FlowRouter.path('Votings'),
        }];
      }
      case 'forum': {
        return [{
          title: __('Forum'),
          url: FlowRouter.path('Forum'),
        }];
      }
      case 'ticket': {
        return [{
          title: __('Worksheets'),
          url: FlowRouter.path('Worksheets'),
//          title: __('Tickets'),
//          url: FlowRouter.path('Tickets'),
        }];
      }
      default: return [];
    }
  },
});
