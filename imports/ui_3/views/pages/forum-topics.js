import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { handleError } from '/imports/ui_3/lib/errors';
import { Topics } from '/imports/api/topics/topics.js';
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


Template.Forum_topics.helpers({
  forumTopics() {
    const communityId = Session.get('activeCommunityId');
    const topics = Topics.find({ communityId, category: 'forum' }, { sort: { createdAt: -1 } });
    const sorted = topics.fetch().sort((t1, t2) => t2.likesCount() - t1.likesCount());
    return sorted;
  },
});

Template.Forum_topics.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.forumtopic.insert',
      collection: Topics,
      schema: Topics.schema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId', 'sticky'],
      type: 'method',
      meteormethod: 'topics.insert',
    });
  },
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

AutoForm.addModalHooks('af.forumtopic.insert');
AutoForm.addHooks('af.forumtopic.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'forum';
    if (!doc.title && doc.text) {
      doc.title = (doc.text).substring(0, 25) + '...';
    }
    return doc;
  },
});
