

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '/imports/api/topics/topics.js';

import '../common/page-heading.js';
import '../components/chatbox.js';
import '../components/votebox.js';
import '../components/comments-section.js';
import './topic-show.html';


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
                    title: 'Votings',
                    url: FlowRouter.path('Topics.vote'),
                }];
                break;
            }
            case 'forum': {
                return [{
                    title: 'Forum',
                    url: FlowRouter.path('Topics.forum'),
                }];
                break;
            }
            case 'ticket': {
                return [{
                    title: 'Tickets',
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
