import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Memberships } from './memberships';
import './entities.js';
import './methods.js';

Memberships.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (entityName) => currentUserHasPermission(`${entityName}.insert`),
    run(entityName) {
      const entity = Memberships.entities[entityName];
      Modal.show('Autoform_edit', {
        id: `af.${entityName}.insert`,
        collection: Memberships,
        fields: entity.inputFields.concat('activeTime'),
        omitFields: entity.omitFields,
        type: 'method',
        meteormethod: 'memberships.insert',
      });
    },
  },
  import: {
    name: 'import',
    icon: () => 'fa fa-upload',
    visible: () => currentUserHasPermission('memberships.upsert'),
    run: () => importCollectionFromFile(Memberships),
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('memberships.inCommunity'),
    run(id, event, instance) {
      const doc = Memberships.findOne(id);
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_edit', {
        id: `af.${doc.entityName()}.view`,
        collection: Memberships,
        fields: entity.inputFields.concat('activeTime'),
        omitFields: entity.omitFields,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(id) {
      const doc = Memberships.findOne(id);
      return currentUserHasPermission(`${doc.entityName()}.update`);
    },
    run(id, event, instance) {
      const doc = Memberships.findOne(id);
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_edit', {
        id: `af.${doc.entityName()}.update`,
        collection: Memberships,
        fields: entity.modifiableFields,
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'memberships.update',
        singleMethodArgument: true,
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible(id) {
      const doc = Memberships.findOne(id);
      return currentUserHasPermission(`${doc.entityName()}.update`);
    },
    run(id, event, instance) {
      const doc = Memberships.findOne(id);
      Modal.show('Autoform_edit', {
        id: `af.${doc.entityName()}.update`,
        collection: Memberships,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'memberships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  invite: {
    name: 'invite',
    icon: () => 'fa fa-user-plus',
    color(id) {
      const doc = Memberships.findOne(id);
      return doc.personId ? 'info' : 'warning';
    },
    visible(id) {
      const doc = Memberships.findOne(id);
      return currentUserHasPermission(`${doc.entityName()}.update`) && !doc.accepted;
    },
    run(id, event, instance) {
      const doc = Memberships.findOne(id);
      Modal.confirmAndCall(Memberships.methods.linkUser, { _id: id }, {
        action: 'invite user',
        message: __('Connecting user', doc.Person().primaryEmail() || __('undefined')),
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible(id) {
      const doc = Memberships.findOne(id);
      return currentUserHasPermission(`${doc.entityName()}.remove`);
    },
    run(id, event, instance) {
      const doc = Memberships.findOne(id);
      Modal.confirmAndCall(Memberships.methods.remove, { _id: id }, {
        action: `delete ${doc.entityName()}`,
        message: 'You should rather archive it',
      });
    },
  },
};

//-------------------------------------------------------

_.each(Memberships.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.insert`);
  AutoForm.addModalHooks(`af.${entityName}.update`);

  AutoForm.addHooks(`af.${entityName}.insert`, {
    formToDoc(doc) {
      _.each(entity.implicitFields, (value, key) => {
        doc[key] = (typeof value === 'function') ? value() : value;
      });
      return doc;
    },
  });
  AutoForm.addHooks(`af.${entityName}.update`, {
    formToModifier(modifier) {
      modifier.$set.approved = true;
      return modifier;
    },
  });
});
