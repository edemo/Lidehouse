import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Session } from 'meteor/session';
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
  const statusObject = doc.statusObject();
  const dataSchema = statusObject.data ? new SimpleSchema(
    statusObject.data.map(function (dataField) { return { [dataField]: /*TODO*/Tickets.extensionRawSchema[dataField] }; })
  ) : undefined;

  const schema = new SimpleSchema([Comments.schema,
    { status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } } },
    statusObject.data ? { [doc.entityName()]: { type: dataSchema, optional: true } } : {},
  ]);
  schema.i18n('schemaTickets');/*TODO*/
  return schema;
}

Topics.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: data => currentUserHasPermission(`${data.entity}.insert`),
    run(data) {
      const entity = Topics.entities[data.entity];
      Modal.show(entity.form, {
        id: `af.${data.entity}.insert`,
        collection: Topics,
        schema: entity.schema,
        fields: entity.inputFields,
        omitFields: entity.omitFields,
        type: 'method',
        meteormethod: 'topics.insert',
        btnOK: `Create ${data.entity}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('topics.inCommunity'),
    href: (data) => `pathFor 'Topic show' _tid=${data._id}`,
    run(data, event, instance) {},
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc && currentUserHasPermission(`${doc.entityName()}.update`);
    },
    run(data, event, instance) {
      const doc = Topics.findOne(data._id);
      const entity = Topics.entities[doc.entityName()];
      Modal.show(entity.form, {
        id: `af.${doc.entityName()}.update`,
        collection: Topics,
        schema: entity.schema,
        fields: doc.modifiableFields(),
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'topics.update',
        singleMethodArgument: true,
      });
    },
  },
  statusUpdate: {
    name: 'statusUpdate',
    icon: () => 'fa fa-edit',
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc && doc.statusObject().data && currentUserHasPermission(`${doc.entityName()}.statusChangeTo.${doc.status}.enter`);
    },
    run(data, event, instance) {
      const doc = Topics.findOne(data._id);
      const entity = Topics.entities[doc.entityName()];
      Modal.show('Autoform_edit', {
        id: `af.${doc.entityName()}.statusUpdate`,
        collection: Topics,
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
    label(data) {
      const newStatus = data.newStatus;
      const statusName = __('schemaTopics.status.' + data.newStatus.name);
      return newStatus.label || __('Change status to', statusName);
    },
    icon(data) {
      const newStatus = data.newStatus;
      return newStatus.icon || 'fa fa-cogs';
    },
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc && currentUserHasPermission(`${doc.entityName()}.statusChangeTo.${data.status}.enter`);
    },
    run(data, event, instance) {
      const newStatus = data.newStatus;
      const doc = Topics.findOne(data._id);
      const entity = Topics.entities[doc.entityName()];
      Session.set('activeTopicId', data._id);
      Session.set('newStatusName', newStatus.name);
      Modal.show('Autoform_edit', {
        id: `af.${doc.entityName()}.statusChange`,
        description: newStatus.message && newStatus.message(data),
        schema: statusChangeSchema(doc, newStatus.name),
        omitFields: ['data'],
        type: 'method',
        meteormethod: 'topics.statusChange',
        btnOK: 'Change status',
      });
    },
  },
  like: {
    name: 'like',
    label(data) {
      const doc = Topics.findOne(data._id);
      return doc.isLikedBy(Meteor.userId()) ? 'Not important' : 'Important';
    },
    icon(data) {
      const doc = Topics.findOne(data._id);
      return doc.isLikedBy(Meteor.userId()) ? 'fa fa-hand-o-down' : 'fa fa-hand-o-up';
    },
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc.category !== 'vote';
    },
    run(data, event, instance) {
      Topics.methods.like.call({ id: data._id }, handleError);
    },
  },
  mute: {
    name: 'mute',
    label(data) {
      const doc = Topics.findOne(data._id);
      return doc.isFlaggedBy(Meteor.userId()) ? 'Unblock content' : 'Block content';
    },
    icon(data) {
      const doc = Topics.findOne(data._id);
      return doc.isFlaggedBy(Meteor.userId()) ? 'fa fa-check' : 'fa fa-ban';
    },
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc.category !== 'vote';
    },
    run(data, event, instance) {
      Topics.methods.flag.call({ id: data._id }, handleError);
    },
  },
  block: {
    name: 'block',
    label(data) {
      const doc = Topics.findOne(data._id);
      const creator = doc.creator();
      if (!creator) return '';
      return doc.creator().isFlaggedBy(Meteor.userId()) ? __('Unblock content from', doc.creator()) : __('Block content from', doc.creator());
    },
    icon(data) {
      const doc = Topics.findOne(data._id);
      const creator = doc.creator();
      if (!creator) return '';
      return doc.creator().isFlaggedBy(Meteor.userId()) ? 'fa fa-check' : 'fa fa-ban';
    },
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc.category !== 'vote';
    },
    run(data, event, instance) {
      const doc = Topics.findOne(data._id);
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible(data) {
      if (!data || !data._id) return false;
      const doc = Topics.findOne(data._id);
      return doc && currentUserHasPermission(`${doc.entityName()}.remove`);
    },
    run(data, event, instance) {
      const doc = Topics.findOne(data._id);
      Modal.confirmAndCall(Topics.methods.remove, { _id: data._id }, {
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
        doc[key] = (typeof value === 'function') ? value() : value;
      });
      doc.status = Topics._transform(doc).startStatus().name;
      if (!doc.title && doc.text) {
        doc.title = (doc.text).substring(0, 25) + '...';
      }
      return doc;
    },
  });
});
