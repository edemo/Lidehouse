import { Template } from 'meteor/templating';

import { Topics } from '/imports/api/topics/topics.js';

import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';
import { voteColumns } from '/imports/api/topics/votings/tables.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { agendaColumns } from '/imports/api/agendas/tables.js';
import { remove as removeAgenda } from '/imports/api/agendas/methods.js';
import { like } from '/imports/api/topics/likes.js';

//import '/imports/ui_3/stylesheets/animatecss/animate.css';
import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';
import '/imports/ui_2/modals/voting-edit.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '../common/page-heading.js';
import '../components/votebox.js';
import '../components/voting-list.html';
import './vote-topics.html';

import './forum-topics.html';
import { handleError } from '../../../ui/lib/errors.js';


Template.Forum_topics.helpers({
    forumTopics() {
        const communityId = Session.get('activeCommunityId');
        const topics = Topics.find({ communityId, category: 'forum' });
        const sorted = topics.fetch().sort((t1, t2) => t2.likesCount() - t1.likesCount());
        return sorted;
    },
});

Template.Forum_topics.events({
    'click .js-like'(event) {
        const id = $(event.target).closest('div.vote-item').data('id');
        like.call({ coll: 'topics', id }, handleError);
    },
    'click .js-show' (event) {
        $('.new-topic').toggleClass("hidden");
        $('.js-show').toggleClass("m-b");
    },
    'click .js-send' (event) {
        $('.new-topic').toggleClass("hidden");
        $('.js-show').toggleClass("m-b");
    },
});
