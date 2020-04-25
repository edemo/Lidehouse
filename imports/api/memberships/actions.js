import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Memberships } from './memberships';
import './entities.js';
import './methods.js';

Memberships.actions = {
  new: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'new',
//    icon: options => (Array.isArray(options.entity) ? 'fa fa-plus' : ''),
    icon: 'fa fa-plus',
    color: 'primary',
    label: options.splitable() ? `${__('new')}  ${__('occupant')}` : `${__('new')} ${__(options.entity.name)}`,
    visible: options.splitable() ? true : user.hasPermission(`${options.entity.name}.insert`, doc),
    subActions: options.splitable() && options.split().map(opts => Memberships.actions.new(opts.fetch(), doc, user)),
    run() {
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.insert`,
        schema: entity.schema,
        omitFields: entity.omitFields,
        doc,
        type: 'method',
        meteormethod: 'memberships.insert',
      });
    },
  }),
  import: (options, doc, user) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('memberships.upsert', doc),
    run: () => importCollectionFromFile(Memberships),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('memberships.inCommunity', doc),
    run() {
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.view`,
        schema: entity.schema,
        omitFields: entity.omitFields,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
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
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.membership.period',
        schema: ActivePeriod.schema,
        doc,
        type: 'method-update',
        meteormethod: 'memberships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  }),
  invite: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'invite',
    label: !doc.userId ? 'invite' : (doc.user().isVerified() ? 'link' : 'reinvite'),
    icon: 'fa fa-user-plus',
    color: doc.userId ? 'info' : 'warning',
    visible: user.hasPermission(`${doc.entityName()}.update`, doc) && !doc.accepted,
    run() {
      const partner = doc.partner();
      const email = partner && partner.contact && partner.contact.email;
      const action = 'invite user';
      if (!doc.userId && !email) {
        displayMessage('warning', 'No contact email set for this partner');
      } else {
        const message = !doc.userId ? __('Connecting user', email) : (doc.user().isVerified() ? __('Linking user') : __('Reconnecting user'));
        Modal.confirmAndCall(Memberships.methods.linkUser, { _id: doc._id }, { action, message });
      }
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission(`${doc.entityName()}.remove`, doc),
    run() {
      Modal.confirmAndCall(Memberships.methods.remove, { _id: doc._id }, {
        action: `delete ${doc.entityName()}`,
        message: doc.entityName() !== 'roleship' && 'You should rather archive it',
      });
    },
  }),
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
