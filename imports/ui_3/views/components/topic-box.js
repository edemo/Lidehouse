import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { AutoForm } from 'meteor/aldeed:autoform';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/comments-section.js';

import './topic-box.html';

Template.Topic_edit_menu.events({
  'click .js-menu .js-block'(event, instance) {
    Meteor.users.methods.flag.call({ id: instance.data.creatorId }, handleError);
  },
  'click .js-menu .js-report'(event, instance) {
    Topics.methods.flag.call({ id: this._id }, handleError);
  },
  'click .forum .js-edit'(event, instance) {
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
  'click .forum .js-delete'(event, instance) {
    Modal.confirmAndCall(Topics.methods.remove, { _id: this._id }, {
      action: 'delete topic',
      message: 'It will disappear forever',
    });
  },
});

Template.Topic_reactions.events({
  'click .js-like'(event) {
    Topics.methods.like.call({ id: this._id }, handleError);
  },
});

AutoForm.addModalHooks('af.forumtopic.update');
