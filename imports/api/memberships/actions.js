import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { displayError, handleError } from '/imports/ui_3/lib/errors.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { debugAssert } from '/imports/utils/assert.js';
import { displayMessage } from '/imports/ui_3/lib/errors.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from './memberships';
import './entities.js';
import './methods.js';

Memberships.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
//    icon: options => (Array.isArray(options.entity) ? 'fa fa-plus' : ''),
    icon: 'fa fa-plus',
    color: 'primary',
    label: options.splitable() ? `${__('new')}  ${__('occupant')}` : `${__('new')} ${__(options.entity.name)}`,
    visible: options.splitable() ? true : user.hasPermission(`${options.entity.name}.insert`, doc),
    subActions: options.splitable() && options.split().map(opts => Memberships.actions.create(opts.fetch(), doc, user)),
    run() {
      const entity = options.entity;
      doc.parcelId = ModalStack.getVar('parcelId');
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.create`,
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
    color: !doc.approved ? 'danger' : '',
    visible: user.hasPermission(`${doc.entityName()}.update`, doc),
    run() {
      const entity = Memberships.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${doc.entityName()}.edit`,
        schema: entity.schema,
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
        meteormethod: 'memberships.update',
        singleMethodArgument: true,
      });
    },
  }),
  invite: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'invite',
    label: !doc.userId ? 'invite' : (doc.user()?.isVerified() ? 'link' : 'reinvite'),
    icon: 'fa fa-user-plus',
    color: doc.userId ? 'info' : 'warning',
    visible: user.hasPermission(`${doc.entityName()}.update`, doc) && !doc.accepted,
    run() {
      const partner = doc.partner();
      const email = partner && partner.contact && partner.contact.email;
      if (!doc.userId && !email) {
        displayMessage('warning', 'No contact email set for this partner');
      } else {
        const message = !doc.userId ? __('Connecting user', email) : (doc.user()?.isVerified() ? __('Linking user') : __('Reconnecting user'));
        Modal.confirmAndCall(Memberships.methods.linkUser, { _id: doc._id }, {
          action: 'invite',
          entity: 'user',
          message,
        });
      }
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: doc?.entityName && user.hasPermission(`${doc.entityName()}.remove`, doc),
    run() {
      Modal.confirmAndCall(Memberships.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: doc.entityName(),
        message: doc.entityName() !== 'roleship' && 'You should rather archive it',
      });
    },
  }),
};

Memberships.batchActions = {
  delete: new BatchAction(Memberships.actions.delete, Memberships.methods.batch.remove),
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.membership.period');

_.each(Memberships.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.create`);
  AutoForm.addModalHooks(`af.${entityName}.edit`);

  AutoForm.addHooks(`af.${entityName}.create`, {
    formToDoc(doc) {
      if (!doc.parcelId) { 
        const community = Communities.findOne(doc.communityId);
        if (community.usesBlankParcels()) {
          doc.parcelId = Parcels.methods.insert.call({ communityId: doc.communityId, category: community.propertyCategory(), ref: 'auto' }, handleError);
        }
      }
      return doc;
    },
  });
  AutoForm.addHooks(`af.${entityName}.edit`, {
    formToModifier(modifier) {
      modifier.$set.approved = true;
      return modifier;
    },
  });
});
