/* globals document */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_2/modals/modal.js';
import '/imports/ui_2/modals/autoform-edit.js';
import '/imports/ui_2/components/collapse-section.js';
import '/imports/ui_2/components/empty-chatbox.js';
import '../components/comments-section.js';
import '../components/chatbox.js';
import '../components/votebox.js';
import '../components/balance-widget.js';
import './board.html';

Template.Board.onCreated(function boardOnCreated() {
});

Template.Board.helpers({
  activeVotingsTitle() {
    const communityId = Session.get('activeCommunityId');
    const topicsCount = Topics.find({ communityId, category: 'vote', closed: false }).count();
    return `${__('Active votings')} (${topicsCount})`;
  },
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('LL');
  },
});

Template.News.helpers({
  topics(category, stickyVal) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false, sticky: stickyVal }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('LL');
  },
});

Template.News.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.news.insert',
      collection: Topics,
      schema: Topics.schema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId'],
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
      btnEdit: 'edit',
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
