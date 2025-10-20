import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { callOrRead } from '/imports/api/utils.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/users/users.js';
import './entities.js';
import './methods.js';

function fixedStatusValue(value) {
  return {
    options() { return [{ label: __('schemaWorkflow.status.options.' + value), value }]; },
    firstOption: false,
    disabled: true,
  };
}
function statusChangeSchema(doc, statusName) {
  debugAssert(statusName);
  const statusObject = doc.statusObject(statusName);
  const dataSchema = statusObject.data ? new SimpleSchema(
    statusObject.data.map(function (dataField) { return { [dataField]: /*TODO*/Tickets.extensionRawSchema[dataField] }; })
  ) : undefined;
  const schema = new SimpleSchema([
    Comments.simpleSchema({ category: 'statusChange' }),
    { status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } } },
    statusObject.data ? { [doc.category]: { type: dataSchema, optional: true } } : {},
  ]);
  schema.i18n('schemaTickets');/*TODO*/
  return schema;
}

Topics.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    color: 'primary',
    label: (options.splitable() ? `${__('new')}  ${__(options.category)}` :
      (options.entity.name === 'issue' ? __('Report issue') : `${__('new')} ${__(options.entity.name)}`)),
    visible: options.splitable() ? true : user.hasPermission(`${options.entity.name}.insert`, doc),
    subActions: options.splitable() && options.split().map(opts => Topics.actions.create(opts.fetch(), doc, user)),
    run() {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        body: options.entity.form,
        // --- autoform ---
        id: `af.${entity.name}.create`,
        schema: entity.schema,
        fields: entity.inputFields,
        doc,
        type: entity.formType || 'method',
        meteormethod: 'topics.insert',
        // --- --- --- ---
        size: entity.form ? 'lg' : 'md',
        btnOK: `Create ${entity.name}`,
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('topics.inCommunity', doc),
    href: FlowRouter.path('Topic show', { _tid: doc._id }),
    run() {
      FlowRouter.go('Topic show', { _tid: doc._id });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: doc && user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
      const entity = Topics.entities[doc.entityName()];
      const fields = doc.category === 'ticket' ? doc.modifiableFields() : undefined;
      Modal.show('Autoform_modal', {
        body: entity.form,
        // --- autoform ---
        id: `af.${doc.entityName()}.edit`,
        schema: entity.schema,
        fields,
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'topics.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.form ? 'lg' : 'md',
      });
    },
  }),
  categoryChange: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'categoryChange',
    icon: 'fa fa-arrows-alt',
    visible: doc && doc.category === 'forum' && user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
      Modal.confirmAndCall(Topics.methods.categoryChange, { _id: doc._id }, {
        action: 'categoryChange',
        entity: doc.entityName(),
      });
    },
  }),
  move: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'move',
    label: __('move under other topic'),
    icon: 'fa fa-arrow-right',
    visible: doc && (doc.entityName() === 'forum' || doc.entityName() === 'ticket') && user.hasPermission('comment.move', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.topic.move',
        schema: Comments.moveSchema,
        doc: { _id: doc._id },
        type: 'method',
        meteormethod: 'topics.move',
      });
    },
  }),
  statusUpdate: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'statusUpdate',
    icon: 'fa fa-edit',
    visible: doc && doc.statusObject().data && user.hasPermission(`${doc.category}.update`, doc)
      && user.hasPermission(`${doc.category}.statusChange.${doc.status}.enter`, doc),
    run() {
      ModalStack.setVar('topicId', doc._id);
      ModalStack.setVar('status', doc.status);
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.statusChange`,
        schema: statusChangeSchema(doc, doc.status),
        omitFields: ['options'],
        type: 'method',
        meteormethod: 'topics.statusChange',
        btnOK: 'actions.statusUpdate.doing',
      });
    },
  }),
  statusChange: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'statusChange',
    label: (!options.status && 'statusChange') || (options.status.label)
      || (__('Change status to', __('schemaWorkflow.status.options.' + options.status.name))),
    icon: (options.status && options.status.icon) || 'fa fa-cogs',
    visible: (!options.status && doc.possibleNextStatuses().length > 0
      && doc.possibleNextStatuses().some(status => user.hasPermission(`${doc.category}.statusChange.${status.name}.enter`, doc)))
      || (options.status && user.hasPermission(`${doc.category}.statusChange.${options.status.name}.enter`, doc)),
    subActions: !options.status // if there is a status specified in options, that is a specific action w/o subActions
      && doc && doc.possibleNextStatuses().map(status => Topics.actions.statusChange({ status }, doc, user)),
    run() {
      const newStatus = options.status;
      ModalStack.setVar('topicId', doc._id);
      ModalStack.setVar('status', newStatus.name);
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.statusChange`,
        description: newStatus.message && newStatus.message(options, doc),
        schema: statusChangeSchema(doc, newStatus.name),
        omitFields: ['options'],
        type: 'method',
        meteormethod: 'topics.statusChange',
        btnOK: 'Change status',
      });
    },
  }),
  like: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'like',
    label: doc && doc.isLikedBy(user._id) ? 'unimportant' : 'important',
    icon: doc && doc.isLikedBy(user._id) ? 'fa fa-hand-o-down' : 'fa fa-hand-o-up',
    visible: doc.category !== 'vote' && doc.creatorId !== user._id && user.hasPermission('like.toggle', doc),
    run() {
      Topics.methods.like.call({ id: doc._id }, handleError);
    },
  }),
  mute: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'mute',
    label: doc && doc.isFlaggedBy(user._id) ? 'Unblock content' : 'Block content',
    icon: doc && doc.isFlaggedBy(user._id) ? 'fa fa-check' : 'fa fa-ban',
    visible: doc.category !== 'vote' && doc.creatorId !== user._id && user.hasPermission('flag.toggle', doc),
    run() {
      Topics.methods.flag.call({ id: doc._id }, handleError);
    },
  }),
  block: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'block',
    label: doc.creator() && (doc.creator().isFlaggedBy(user._id)
      ? __('Unblock content from', doc.creator().displayOfficialName())
      : __('Block content from', doc.creator().displayOfficialName())),
    icon: doc.creator() && (doc.creator().isFlaggedBy(user._id)
      ? 'fa fa-check fa-user' : 'fa fa-ban fa-user-o'),
    visible: doc.category !== 'vote' && doc.creatorId !== user._id && user.hasPermission('flag.toggle', doc),
    run() {
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  }),
  archive: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'archive',
    icon: 'fa fa-archive',
    visible: ['news', 'forum'].includes(doc?.entityName()) && doc.status !== 'closed' && user.hasPermission(`${doc.entityName()}.remove`, doc),
    run() {
      Modal.confirmAndCall(Topics.methods.archive, { _id: doc._id }, {
        action: 'archive',
        entity: doc.entityName(),
        message: 'It will be taken off the page',
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: doc?.entityName && user.hasPermission(`${doc.entityName()}.remove`, doc),
    run() {
      Modal.confirmAndCall(Topics.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: doc.entityName(),
        message: 'It will disappear forever',
      });
    },
  }),
};

Topics.batchActions = {
  delete: new BatchAction(Topics.actions.delete, Topics.methods.batch.remove),
};

//-------------------------------------------------------

_.each(Topics.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.create`);
  AutoForm.addModalHooks(`af.${entityName}.edit`);
  AutoForm.addModalHooks(`af.${entityName}.statusChange`);

  AutoForm.addHooks(`af.${entityName}.create`, {
    formToDoc(doc) {
      _.each(entity.implicitFields, (value, key) => {
        Object.setByString(doc, key, callOrRead.call(this, value));
      });
      doc.status = Topics._transform(doc).startStatus().name;
      if (!doc.title && doc.text) {
        doc.title = (doc.text).substring(0, 25) + '...';
      }
      return doc;
    },
  });

  AutoForm.addHooks(`af.${entityName}.statusChange`, {
    formToDoc(doc) {
      doc.topicId = ModalStack.getVar('topicId');
      doc.category = 'statusChange';
      doc.status = ModalStack.getVar('status');

      doc.dataUpdate = doc['ticket'] || {}; // can use topic.category instead of ticket, if other than tickets have data too
      delete doc['ticket'];
      return doc;
    },
  });
});
AutoForm.addModalHooks('af.topic.move');
