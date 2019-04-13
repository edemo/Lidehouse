import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from '/imports/api/topics/topics.js';
import { like } from '/imports/api/topics/likes.js';
import { flag } from '/imports/api/topics/flags.js';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/comments-section.js';
import './chatbox.html';

Template.Chatbox.onRendered(function chatboxOnRendered() {
});

Template.Chatbox.helpers({
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
  hiddenBy() {
    const communityId = Session.get('activeCommunityId');
    return this.flaggedStatus(communityId) || this.createdBy().flaggedStatus(communityId);
  },
  join(memberships) {
    // return memberships.map(m => m.toString()).join(', ');
    return _.uniq(memberships.map(m => __(m.role))).join(', ');
  },
});

Template.Chatbox.events({
  'click .js-edit-topic'(event, instance) {
    const id = this._id;
    Modal.show('Autoform_edit', {
      id: 'af.forumtopic.update',
      collection: Topics,
      schema: Topics.schema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId', 'sticky'],
      doc: Topics.findOne(id),
      type: 'method-update',
      meteormethod: 'topics.update',
      singleMethodArgument: true,
    });
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeTopic, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
  'click .js-block'(event, instance) {
    flag.call({ coll: 'users', id: instance.data.userId }, handleError);
  },
  'click .js-report'(event, instance) {
    flag.call({ coll: 'topics', id: this._id }, handleError);
  },
  'click .social-body .js-like'(event) {
    like.call({ coll: 'topics', id: this._id }, handleError);
  },
});

AutoForm.addModalHooks('af.forumtopic.update');
