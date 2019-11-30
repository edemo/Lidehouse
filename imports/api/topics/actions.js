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

Session.update = function update(sessionVarName, key, value) {
  const sessionVar = Session.get(sessionVarName) || {};
  sessionVar[key] = value;
  Session.set(sessionVarName, sessionVar);
};

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
    visible: (options) => currentUserHasPermission(`${options.entity}.insert`),
    run(options) {
      const entity = Topics.entities[options.entity];
      Session.update('activeAutoform', 'ticketType', options.entity);
      Session.update('activeAutoform', 'contractId', options.contractId);
      Modal.show(entity.form, {
        id: `af.${options.entity}.insert`,
        collection: Topics,
        schema: entity.schema,
        fields: entity.inputFields,
        omitFields: entity.omitFields,
        doc: options,
        type: 'method',
        meteormethod: 'topics.insert',
        btnOK: `Create ${options.entity}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('topics.inCommunity'),
    href: (options, doc) => `pathFor 'Topic show' _tid=${doc._id}`,
    run(options, doc, event, instance) {},
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`),
    run(options, doc, event, instance) {
      const entity = Topics.entities[doc.entityName()];
      Modal.show(entity.form, {
        id: `af.${doc.entityName()}.update`,
        collection: Topics,
        schema: entity.schema,
        fields: _.intersection(entity.inputFields, doc.modifiableFields()),
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
    visible: (options, doc) => doc && doc.statusObject().data && currentUserHasPermission(`${doc.category}.statusChangeTo.${doc.status}.enter`),
    run(options, doc, event, instance) {
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
    label(options) {
      const statusName = __('schemaTopics.status.' + options.newStatus.name);
      return options.newStatus.label || __('Change status to', statusName);
    },
    icon(options) {
      const newStatus = options.newStatus;
      return newStatus.icon || 'fa fa-cogs';
    },
    visible(options, doc) {
      return doc && currentUserHasPermission(`${doc.category}.statusChangeTo.${options.newStatus.name}.enter`);
    },
    run(options, doc, event, instance) {
      const newStatus = options.newStatus;
      const entity = Topics.entities[doc.entityName()];
      Session.update('activeAutoform', 'topicId', doc._id);
      Session.update('activeAutoform', 'newStatusName', newStatus.name);
      Modal.show('Autoform_edit', {
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
      return doc && doc.isLikedBy(Meteor.userId()) ? 'Not important' : 'Important';
    },
    icon(options, doc) {
      return doc && doc.isLikedBy(Meteor.userId()) ? 'fa fa-hand-o-down' : 'fa fa-hand-o-up';
    },
    visible(options, doc) {
      return doc && doc.category !== 'vote';
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
      return doc && doc.category !== 'vote';
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
      return doc.creator().isFlaggedBy(Meteor.userId()) ? __('Unblock content from', doc.creator()) : __('Block content from', doc.creator());
    },
    icon(options, doc) {
      const creator = doc && doc.creator();
      if (!creator) return '';
      return doc.creator().isFlaggedBy(Meteor.userId()) ? 'fa fa-check' : 'fa fa-ban';
    },
    visible: (options, doc) => doc && doc.category !== 'vote',
    run(options, doc, event, instance) {
      Meteor.users.methods.flag.call({ id: doc.creatorId }, handleError);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.remove`),
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
        doc[key] = (typeof value === 'function') ? value() : value;
      });
      doc.status = Topics._transform(doc).startStatus().name;
      if (!doc.title && doc.text) {
        doc.title = (doc.text).substring(0, 25) + '...';
      }
      return doc;
    },
    onSuccess(formType, result) {
      Session.set('activeAutoform');  // clear it
    },
  });

  AutoForm.addHooks(`af.${entityName}.statusChange`, {
    formToDoc(doc) {
      doc.topicId = Session.get('activeAutoform').topicId;
      doc.type = 'statusChangeTo'; // `statusChangeTo.${newStatusName}`;
      doc.status = Session.get('activeAutoform').newStatusName;
      doc.data = doc[entityName] || {};
      delete doc[entityName];
      return doc;
    },
    onSuccess(formType, result) {
      Session.set('activeAutoform');  // clear it
    },
  });
});
