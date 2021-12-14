import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Fraction } from 'fractional';
import { _ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcels } from './parcels.js';
import './methods.js';
import './entities.js';

Parcels.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    color: 'primary',
    label: (options.splitable() ? `${__('new') + ' ' + __('parcel')}`
      : `${__('new')} ${__('schemaParcels.category.options.' + options.entity.name)}`),
    visible: user.hasPermission('parcels.insert', doc),
    subActions: options.splitable() && options.split().map(opts => Parcels.actions.create(opts.fetch(), doc, user)),
    run() {
      let entity = options.entity;
      if (typeof entity === 'string') entity = Parcels.entities[entity];
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.create`,
        schema: entity.schema,
        doc,
        type: 'method',
        meteormethod: 'parcels.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('parcels.upsert', doc),
    run: () => importCollectionFromFile(Parcels),
  }),
  view: (options, doc, user) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('parcels.inCommunity', doc),
    run() {
      const entity = Parcels.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.view`,
        schema: entity.schema,
        doc,
        type: 'readonly',
      });
    },
  }),
  occupants: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'occupants',
    label: 'occupants',
    icon: (doc && doc.isLed() ? 'fa fa-user-o' : 'fa fa-user'),
    color: (() => {
      let colorClass = '';
      if (Memberships.findOneActive({ parcelId: doc._id, approved: false })) colorClass = 'danger';
      else {
        const representor = doc.representorOrFirstOwner();
        if (representor) {
          if (!representor.accepted) {
            if (!representor.userId) colorClass = 'warning';
            else colorClass = 'info';
          }
        } else colorClass = 'danger';
      }
      return colorClass;
    })(),
    visible: user.hasPermission('memberships.inCommunity', doc),
    run() {
      ModalStack.setVar('parcelId', doc._id);
      Modal.show('Modal', {
        title: `${doc ? doc.display() : __('unknown')} - ${__('occupants')}`,
        body: 'Occupants_box',
        bodyContext: {
          community: doc.community(),
          parcel: doc,
        },
        size: user.hasPermission('partners.details', doc) ? 'lg' : 'md',
      });
    },
  }),
  meters: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'meters',
    label: 'meters',
    icon: 'fa fa-tachometer',
    color: doc.oldestReadMeter() && doc.oldestReadMeter().lastReadingColor(),
    visible: user.hasPermission('parcels.details', doc),
    run(event, instance) {
      ModalStack.setVar('parcelId', doc._id);
      Modal.show('Modal', {
        title: `${doc ? doc.display() : __('unknown')} - ${__('meters')}`,
        body: 'Meters_box',
        bodyContext: {
          community: doc.community(),
          parcels: [doc],
        },
        size: user.hasPermission('meters.update', doc) ? 'lg' : 'md',
      });
    },
  }),
  contracts: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'memberContract',
    label: 'memberContract',
    icon: 'fa fa-handshake-o',
    visible: user.hasPermission('parcels.details', doc),
    color: (() => {
      const active = Contracts.findOneActive({ parcelId: doc._id });
      if (active) {
        const pre = active.predecessor();
        if (pre && !Date.equal(pre?.activeTime?.end, active?.activeTime?.begin)) return 'danger';
        else return '';
      } else return 'info';
    })(),
    run(event, instance) {
      ModalStack.setVar('parcelId', doc._id);
      Modal.show('Modal', {
        title: `${doc ? doc.display() : __('unknown')} - ${__('contracts')}`,
        body: 'Contracts_box',
        bodyContext: {
          community: doc.community(),
          parcel: doc,
        },
        size: user.hasPermission('contracts.update', doc) ? 'lg' : 'md',
      });
/*      let contract = doc.payerContract();
      if (!contract) {
        contract = doc._contractSelector();
        Modal.show('Autoform_modal', {
          id: 'af.contract.create',
          schema: Contracts.simpleSchema(contract),
          doc: contract,
          type: 'method',
          meteormethod: 'contracts.insert',
        });
      } else {
        Modal.show('Autoform_modal', {
          id: 'af.contract.edit',
          schema: Contracts.simpleSchema(contract),
          doc: contract,
          type: 'method-update',
          meteormethod: 'contracts.update',
          singleMethodArgument: true,
        });
      }*/
    },
  }),
  finances: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'finances',
    label: 'finances',
    icon: 'fa fa-eye',
    visible: user.hasPermission('parcels.inCommunity', doc),
    href: '#view-target',
    run(event, instance) {
      Session.set('contractToView', doc.payerContract()._id);
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    color: !doc.approved ? 'danger' : '',
    visible: user.hasPermission('parcels.update', doc),
    run() {
      const entity = Parcels.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.edit`,
        schema: entity.schema,
        doc,
        type: 'method-update',
        meteormethod: 'parcels.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('parcels.update', doc),
    run() {
      const entity = Parcels.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        id: `af.${entity.name}.edit`,
        schema: ActivePeriod.schema,
        doc,
        type: 'method-update',
        meteormethod: 'parcels.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('parcels.remove', doc),
    run() {
      Modal.confirmAndCall(Parcels.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: doc.entityName(),
        message: 'You should rather archive it',
      });
    },
  }),
};

Parcels.batchActions = {
  delete: new BatchAction(Parcels.actions.delete, Parcels.methods.batch.remove),
};

//-----------------------------------------------

export function setMeAsParcelOwner(parcelId, communityId, callback) {
  Memberships.methods.insert.call({
    userId: Meteor.userId(),
    communityId,
    approved: false,  // any user can submit not-yet-approved memberships
    role: 'owner',
    parcelId,
    ownership: {
      share: new Fraction(1),
    },
  }, callback);
}

function onJoinParcelInsertSuccess(parcelId) {
  const communityId = FlowRouter.current().params._cid;
  const communityName = Communities.findOne(communityId).name;
  setMeAsParcelOwner(parcelId, communityId, onSuccess((res) => {
    displayMessage('success', 'Join request submitted', communityName);
    Meteor.setTimeout(() => Modal.show('Modal', {
      title: __('Join request submitted', communityName),
      text: __('Join request notification'),
      btnOK: 'ok',
      //      btnClose: 'cancel',
      onOK() { FlowRouter.go('App home'); },
      //      onClose() { removeMembership.call({ _id: res }); }, -- has no permission to do it, right now
    }), 3000);
  }),
  );
}

Parcels.categoryValues.forEach(category => {
  AutoForm.addModalHooks(`af.${category}.create`);
  AutoForm.addModalHooks(`af.${category}.edit`);

  AutoForm.addHooks(`af.${category}.create`, {
    formToDoc(doc) {
      doc.category = category;
      return doc;
    },
  });
  AutoForm.addHooks(`af.${category}.edit`, {
    formToModifier(modifier) {
      modifier.$set.approved = true;
      return modifier;
    },
  });
});

AutoForm.addModalHooks('af.@property.create.unapproved');
AutoForm.addHooks('af.@property.create.unapproved', {
  formToDoc(doc) {
    doc.approved = false;
    doc.category = '@property';
    return doc;
  },
  onSuccess(formType, result) {
    onJoinParcelInsertSuccess(result);
  },
});
