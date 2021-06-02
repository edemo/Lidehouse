import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

import '../common/error.js';
import '../common/page-heading.js';
import '../components/topic-box.js';
import '../components/topic-ticket-box.js';
import '../components/topic-vote-box.js';
import '../components/revision-history.js';
import './topic-show.html';
import { ModalStack } from '../../lib/modal-stack.js';

Template.Topic_show.onCreated(function topicShowOnCreated() {
  this.autorun(() => {
    const topicId = FlowRouter.getParam('_tid');
    const topic = topicId && Topics.findOne(topicId);
    this.subscribe('topics.byId', { _id: topicId });  // brings all comments with it
    if (topic) ModalStack.setVar('communityId', topic.communityId);
  });
});

Template.Topic_show.helpers({
  topic() {
    const topicId = FlowRouter.getParam('_tid');
    const topic = topicId && Topics.findOne(topicId);
    return topic;
  },
  pageTitle() {
    return __('schemaTopics.category.options.' + this.category) + ' ' + __('details');
  },
  smallTitle() {
    return this.title;
  },
  pageCrumbs() {
    switch (this.category) {
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
//          title: __('Tickets report'),
//          url: FlowRouter.path('Tickets report'),
        }];
      }
      default: return [];
    }
  },
  redirectToDestination(destinationId) {
    Meteor.setTimeout(function () {
      FlowRouter.go('Topic show', { _tid: destinationId });
    }, 3000);
  },
});
