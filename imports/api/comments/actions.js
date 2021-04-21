import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/users/users.js';
import './methods.js';

Comments.actions = {
  create: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission(`comment.insert`, doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.comment.create',
        schema: Comments.simpleSchema({ category: 'comment' }),
        doc,
        type: 'method',
        meteormethod: 'comments.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('events.inCommunity', doc),
    run() { /* NOP -- 'comments.view is not used as command');*/ },
  }),
  inplaceEdit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'inplaceEdit',
    label: 'edit',
    icon: 'fa fa-pencil',
    visible: doc && user.hasPermission(`${doc.entityName()}.update`, doc),
    run() { /* NOP -- 'comments.inplaceEdit is not used as command');*/ },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: doc && user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.comment.edit',
        schema: Comments.simpleSchema({ category: 'comment' }),
        doc,
        type: 'method-update',
        meteormethod: 'comments.update',
        singleMethodArgument: true,
      });
    },
  }),
  move: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'move',
    icon: 'fa fa-arrow-right',
    visible: doc && user.hasPermission(`${doc.entityName()}.move`, doc),
    run() {
      debugAssert(doc.entityName() === 'comment', 'only comment can be moved');
      Modal.show('Autoform_modal', {
        id: 'af.comment.move',
        schema: Comments.moveSchema,
        doc: { _id: doc._id },
        type: 'method',
        meteormethod: 'comments.move',
      });
    },
  }),
  like: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'like',
    label: doc.isLikedBy(user._id) ? 'unimportant' : 'important',
    icon: doc.isLikedBy(user._id) ? 'fa fa-hand-o-down' : 'fa fa-hand-o-up',
    visible: (doc.creatorId !== user._id) && user.hasPermission('like.toggle', doc),
    run() {
      Comments.methods.like.call({ id: doc._id }, handleError);
    },
  }),
  mute: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'mute',
    label: doc.isFlaggedBy(user._id) ? 'Unblock content' : 'Block content',
    icon: doc.isFlaggedBy(user._id) ? 'fa fa-check' : 'fa fa-ban',
    visible: (doc.creatorId !== user._id) && user.hasPermission('flag.toggle', doc),
    run() {
      Comments.methods.flag.call({ id: doc._id }, handleError);
    },
  }),
  block: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'block',
    label: doc.creator() && doc.creator().isFlaggedBy(user._id)
      ? __('Unblock content from', doc.creator().displayOfficialName())
      : __('Block content from', doc.creator().displayOfficialName()),
    icon: doc.creator() && doc.creator().isFlaggedBy(user._id)
      ? 'fa fa-check fa-user' : 'fa fa-ban fa-user-o',
    visible: doc.creatorId !== user._id && user.hasPermission('flag.toggle', doc),
    run() {
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: doc?.entityName && user.hasPermission(`${doc.entityName()}.remove`, doc),
    run() {
      Modal.confirmAndCall(Comments.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: doc.entityName(),
        message: 'It will disappear forever',
      });
    },
  }),
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.comment.create');
AutoForm.addModalHooks('af.comment.edit');
AutoForm.addModalHooks('af.comment.move');
