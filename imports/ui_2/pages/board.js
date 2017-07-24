/* globals document */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/modal.js';
import '../modals/autoform-edit.js';
import '../components/comments-section.js';
import '../components/votebox.js';
import '../components/chatbox.js';
import '../components/empty-chatbox.js';
import './board.html';


Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Board.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});

Template.News.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});

let newsEditSchema;
Meteor.startup(function defineNewsEditSchema() {
  newsEditSchema = Topics.schema.pick(['title', 'text']); // pick needs to happen AFTER the i18n labels are attached;
});

Template.News.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.news.insert',
      collection: Topics,
      schema: newsEditSchema,
//      omitFields: ['communityId', 'userId', 'category', 'participantIds', 'closed'],
      type: 'method',
      meteormethod: 'topics.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-view'(event, instance) {
    const modalContext = {
      title: this.title,
      body: 'Proposal_view',
      bodyContext: this,
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
});

AutoForm.addModalHooks('af.news.insert');
AutoForm.addModalHooks('af.news.update');
AutoForm.addHooks('af.news.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'news';
    return doc;
  },
});
