

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '/imports/api/topics/topics.js';

import '../common/error.js';
import '../common/page-heading.js';
import '../components/chatbox.js';
import '../components/votebox.js';
import '../components/comments-section.js';
import '../components/vote-history.js';
import './topic-show.html';

Template.Topic_show.onCreated(function topicShowOnCreated() {
  
  // TODO: Why these subs to topic not work to avoid 404 page? 
//  this.subscribe('topics.byId', { _id: this.data._id });
//  const communityId = Session.get('activeCommunityId');
//  this.subscribe('topics.inCommunity', { communityId });

  // Only this full subscriptions (copied from main.js) avoids the 404 page, but why...
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    this.subscribe('memberships.ofUser', { userId: Meteor.userId() });
  });
  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      this.subscribe('communities.byId', { _id: activeCommunityId });
    }
  });
});

Template.Topic_show.helpers({
    topic() {
        const topic = Topics.findOne(FlowRouter.getParam('_tid'));
        return topic;
    },
    pageTitle() {
        return __('topic.' + this.category) + ' ' + __('details');
    },
    smallTitle() {
        return this.title;
    },
    pageCrumbs() {
        switch(this.category) {
            case 'vote': {
                return [{
                    title: __('Votings'),
                    url: FlowRouter.path('Topics.vote'),
                }];
                break;
            }
            case 'forum': {
                return [{
                    title: __('Forum'),
                    url: FlowRouter.path('Topics.forum'),
                }];
                break;
            }
            case 'ticket': {
                return [{
                    title: __('Tickets'),
                    url: FlowRouter.path('Tickets.report'),
                }];
                break;
            }
            default: return [];
        }
    },
});

Template.Ticket_topic_show.helpers({
  statusColor(value) {
    return Topics.statusColors[value];
  },
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
});
