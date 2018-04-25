

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '/imports/api/topics/topics.js';

import '../common/page-heading.js';
import './topic-show.html';


Template.Topic_show.helpers({
    pageTitle() {
        return __('voting') + ' ' + __('data');
    },
    pageCategory() {
        return __('Votings');
    },
    topic() {
        const topic = Topics.findOne(FlowRouter.getParam('_tid'));
        return topic;
    },
});
