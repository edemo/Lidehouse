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
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';
import '/imports/api/users/users.js';
import './entities.js';
import './methods.js';

function fixedStatusValue(value) {
  return {
    options() { return [{ label: __('schemaTopics.status.' + value), value }]; },
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
    Comments.simpleSchema({ category: 'statusChangeTo' }),
    { status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } } },
    statusObject.data ? { [doc.category]: { type: dataSchema, optional: true } } : {},
  ]);
  schema.i18n('schemaTickets');/*TODO*/
  return schema;
}

Topics.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission(`${options.entity.name}.insert`, doc),
    run(options, doc) {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        body: options.entity.form,
        // --- autoform ---
        id: `af.${entity.name}.insert`,
        schema: entity.schema,
        fields: entity.inputFields,
        omitFields: (entity.omitFields || []).concat(Session.get('modalContext').omitFields),
        doc,
        type: entity.formType || 'method',
        meteormethod: 'topics.insert',
        // --- --- --- ---
        size: entity.form ? 'lg' : 'md',
        btnOK: `Create ${entity.name}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('topics.inCommunity', doc),
    href: (options, doc) => FlowRouter.path('Topic show', { _tid: doc._id }),
    run(options, doc, event, instance) {},
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`, doc),
    run(options, doc, event, instance) {
      const entity = Topics.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        body: entity.form,
        // --- autoform ---
        id: `af.${doc.entityName()}.update`,
        schema: entity.schema,
        fields: _.intersection(entity.inputFields, doc.modifiableFields()),
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'topics.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.form ? 'lg' : 'md',
      });
    },
  },
  statusUpdate: {
    name: 'statusUpdate',
    icon: () => 'fa fa-edit',
    visible: (options, doc) => doc && doc.statusObject().data && currentUserHasPermission(`${doc.category}.statusChangeTo.${doc.status}.enter`, doc),
    run(options, doc, event, instance) {
      const entity = Topics.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.statusUpdate`,
        schema: entity.schema,
        fields: doc.statusFields(),
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'topics.statusUpdate',
        singleMethodArgument: true,
      });
    },
  },
  statusChange: {
    name: 'statusChange',
    label(options) {
      const newStatus = options.status;
      const newStatusName = __('schemaTopics.status.' + newStatus.name);
      return newStatus.label || __('Change status to', newStatusName);
    },
    icon(options) {
      const newStatus = options.status;
      return newStatus.icon || 'fa fa-cogs';
    },
    visible(options, doc) {
      return doc && currentUserHasPermission(`${doc.category}.statusChangeTo.${options.status.name}.enter`, doc);
    },
    run(options, doc, event, instance) {
      const newStatus = options.status;
      Session.update('modalContext', 'topicId', doc._id);
      Session.update('modalContext', 'status', newStatus.name);
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
      if (!doc && doc.category === 'vote') return false;
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('like.toggle', doc);
    },
    run(options, doc, event, instance) {
      Topics.methods.like.call({ id: doc._id }, handleError);
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
      if (!doc && doc.category === 'vote') return false;
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('flag.toggle', doc);
    },
    run(options, doc, event, instance) {
      Topics.methods.flag.call({ id: doc._id }, handleError);
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
      if (!doc && doc.category === 'vote') return false;
      if (doc.creatorId === Meteor.userId()) return false;
      return currentUserHasPermission('flag.toggle', doc);
    },
    run(options, doc, event, instance) {
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.remove`, doc),
    run(options, doc, event, instance) {
      Modal.confirmAndCall(Topics.methods.remove, { _id: doc._id }, {
        action: `delete ${doc.entityName()}`,
        message: 'It will disappear forever',
      });
    },
  },
};

//-------------------------------------------------------

_.each(Topics.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.insert`);
  AutoForm.addModalHooks(`af.${entityName}.update`);
  AutoForm.addModalHooks(`af.${entityName}.statusUpdate`);
  AutoForm.addModalHooks(`af.${entityName}.statusChange`);

  AutoForm.addHooks(`af.${entityName}.insert`, {
    formToDoc(doc) {
      _.each(entity.implicitFields, (value, key) => {
        Object.setByString(doc, key, (typeof value === 'function') ? value() : value);
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
      doc.topicId = Session.get('modalContext').topicId;
      doc.category = 'statusChangeTo'; // `statusChangeTo.${status}`;
      doc.status = Session.get('modalContext').status;
      //  const topic = Topics.findOne(doc.topicId);
      doc.dataUpdate = doc['ticket'] || {}; // can use topic.category instrad of ticket, if other than tickets have data too
      delete doc['ticket'];
      return doc;
    },
  });
});
