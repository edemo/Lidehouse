import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Memberships } from './memberships';
import './entities.js';
import './methods.js';

Memberships.actions = {
  new: {
    name: 'new',
//    icon: options => (Array.isArray(options.entity) ? 'fa fa-plus' : ''),
    icon: () => 'fa fa-plus',
    color: () => 'primary',
    label: options => (Array.isArray(options.entity) ? `${__('new')}  ${__('occupant')}` : `${__('new')} ${__(options.entity.name)}`),
    visible: (options, doc) => currentUserHasPermission(`${options.entity.name}.insert`, doc),
    subActions: options => Array.isArray(options.entity) && options.entity.length,
    subActionsOptions: (options, doc) => options.entity.map(entity => ({ entity })),
    run(options) {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.insert`,
        schema: entity.schema,
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
    visible: (options, doc) => currentUserHasPermission('memberships.upsert', doc),
    run: () => importCollectionFromFile(Memberships),
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('memberships.inCommunity', doc),
    run(options, doc, event, instance) {
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.view`,
        schema: entity.schema,
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
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`, doc),
    run(options, doc, event, instance) {
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.update`,
        schema: entity.schema,
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
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`, doc),
    run(options, doc, event, instance) {
      Modal.show('Autoform_modal', {
        id: 'af.membership.period',
        schema: ActivePeriod.schema,
        doc,
        type: 'method-update',
        meteormethod: 'memberships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  invite: {
    name: 'invite',
    label: (options, doc) => (doc && doc.userId ? 'link' : 'invite'),
    icon: () => 'fa fa-user-plus',
    color: (options, doc) => (doc && doc.userId ? 'info' : 'warning'),
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.update`, doc) && !doc.accepted,
    run(options, doc, event, instance) {
      if (doc.userId) Memberships.methods.linkUser.call({ _id: doc._id });
      else {
        const email = doc.partner().contact && doc.partner().contact.email;
        if (!email) displayMessage('warning', 'No contact email set for this membership');
        else {
          Modal.confirmAndCall(Memberships.methods.linkUser, { _id: doc._id }, {
            action: 'invite user',
            message: __('Connecting user', email),
          });
        }
      }
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => doc && currentUserHasPermission(`${doc.entityName()}.remove`, doc),
    run(options, doc, event, instance) {
      Modal.confirmAndCall(Memberships.methods.remove, { _id: doc._id }, {
        action: `delete ${doc.entityName()}`,
        message: 'You should rather archive it',
      });
    },
  },
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.membership.period');

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
