import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/users/users.js';
import './methods.js';

Comments.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission(`${options.entity.name}.insert`, doc),
    run(options, doc) { /* NOP -- 'comments.insert is not used as command');*/ },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('events.inCommunity', doc),
    run(options, doc) { /* NOP -- 'comments.view is not used as command');*/ },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`, doc),
    run(options, doc) { /* NOP -- 'comments.edit is not used as command');*/ },
  },
  move: {
    name: 'move',
    icon: () => 'fa fa-arrow-right',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.move`, doc),
    run(options, doc) {
      debugAssert(doc.entityName() === 'comment', 'only comment can be moved');
      Modal.show('Autoform_modal', {
        id: 'af.comment.move',
        schema: Comments.moveSchema,
        doc: { _id: doc._id },
        type: 'method',
        meteormethod: 'comments.move',
      });
    },
  },
  like: {
    name: 'like',
    label(options, doc) {
      return doc && doc.isLikedBy(Meteor.userId()) ? 'unimportant' : 'important';
    },
    icon(options, doc) {
      return doc && doc.isLikedBy(Meteor.userId()) ? 'fa fa-hand-o-down' : 'fa fa-hand-o-up';
    },
    visible(options, doc) {
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('like.toggle', doc);
    },
    run(options, doc) {
      Comments.methods.like.call({ id: doc._id }, handleError);
    },
  },
  mute: {
    name: 'mute',
    label(options, doc) {
      return doc && doc.isFlaggedBy(Meteor.userId()) ? 'Unblock content' : 'Block content';
    },
    icon(options, doc) {
      return doc && doc.isFlaggedBy(Meteor.userId()) ? 'fa fa-check' : 'fa fa-ban';
    },
    visible(options, doc) {
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('flag.toggle', doc);
    },
    run(options, doc) {
      Comments.methods.flag.call({ id: doc._id }, handleError);
    },
  },
  block: {
    name: 'block',
    label(options, doc) {
      const creator = doc && doc.creator();
      if (!creator) return '';
      return doc.creator().isFlaggedBy(Meteor.userId()) ? __('Unblock content from', doc.creator().toString()) : __('Block content from', doc.creator().toString());
    },
    icon(options, doc) {
      const creator = doc && doc.creator();
      if (!creator) return '';
      return doc.creator().isFlaggedBy(Meteor.userId()) ? 'fa fa-check fa-user' : 'fa fa-ban fa-user-o';
    },
    visible(options, doc) {
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('flag.toggle', doc);
    },
    run(options, doc) {
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.remove`, doc),
    run(options, doc) {
      Modal.confirmAndCall(Comments.methods.remove, { _id: doc._id }, {
        action: `delete ${doc.entityName()}`,
        message: 'It will disappear forever',
      });
    },
  },
};

//-------------------------------------------------------

//  AutoForm.addModalHooks(`af.comment.insert`);
//  AutoForm.addModalHooks(`af.comment.update`);
AutoForm.addModalHooks('af.comment.move');
