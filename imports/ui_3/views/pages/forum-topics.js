import { Template } from 'meteor/templating';

import { Topics } from '/imports/api/topics/topics.js';

import { Session } from 'meteor/session';
import { like } from '/imports/api/topics/likes.js';

//import '/imports/ui_3/stylesheets/animatecss/animate.css';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/voting-edit.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '../common/page-heading.js';
import '../components/votebox.js';
import '../components/voting-list.html';
import './vote-topics.html';

import './forum-topics.html';
import { handleError } from '../../../ui_3/lib/errors';


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
