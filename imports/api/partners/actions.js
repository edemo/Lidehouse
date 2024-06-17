import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { defaultBeginDate, defaultEndDate } from '/imports/ui_3/helpers/utils.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { Partners } from '/imports/api/partners/partners.js';
import { userUnlinkNeeded } from './methods.js';

Partners.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: `${__('new') + ' ' + __('partner')}`,
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('partners.insert', doc),
    run() {
      const relation = AutoForm.getFieldValue('relation') ||  ModalStack.getVar('relation');
      if (relation) _.extend(doc, { relation: [relation] });
//      const activeTxdef = ModalStack.getVar('txdef');
//      if (activeTxdef)  _.extend(doc, { relation: [activeTxdef.data.relation] });
      const statementEntry = ModalStack.getVar('statementEntry');
      if (statementEntry) _.deepExtend(doc, { idCard: { name: statementEntry.name } });

      Modal.show('Autoform_modal', {
        id: 'af.partner.create',
        collection: Partners,
        doc,
        type: 'method',
        meteormethod: 'partners.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('partners.upsert', doc),
    run: () => importCollectionFromFile(Partners),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('partners.details', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.partner.view',
        collection: Partners,
        doc,
        type: 'readonly',
      });
    },
  }),
  history: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'history',
    label: 'history',
    icon: 'fa fa-money',
    visible: user.hasPermission('partners.inCommunity', doc),
    run(event, instance) {
      const contracts = doc.contracts();
      Modal.show('Modal', {
        id: 'partnerhistory.view',
        title: 'Partner history',
        body: 'Partner_history',
        bodyContext: {
          beginDate: defaultBeginDate(),
          endDate: defaultEndDate(),
          partnerOptions: contracts.map(c => ({ label: c.toString(), value: c._id })),
//          partnerSelected: ,
        },
        size: 'lg',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    color: doc.isApproved?.() ? 'white' : (doc.community().needsJoinApproval() ? 'danger' : 'warning'),
    visible: user.hasPermission('partners.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.partner.edit',
        collection: Partners,
        doc,
        type: 'method-update',
        meteormethod: 'partners.update',
        singleMethodArgument: true,
      });
    },
  }),
  merge: (options, doc, user = Meteor.userOrNull()) => {
    const destinationId = doc.idCard?.name &&
      Partners.findOne({ _id: { $ne: doc._id }, communityId: doc.communityId, 'idCard.name': doc.idCard.name })?._id;
    return {
      name: 'merge',
      icon: 'fa fa-compress',
      color: destinationId && 'danger',
      visible: user.hasPermission('partners.update', doc),
      run() {
        Modal.show('Autoform_modal', {
          description: 'warningPartnerMerge',
          id: 'af.partner.merge',
          schema: Partners.mergeSchema,
          doc: { _id: doc._id, destinationId },
          type: 'method',
          meteormethod: 'partners.merge',
        });
      },
    };
  },
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('partners.remove', doc),
    run() {
      Modal.confirmAndCall(Partners.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'partner',
        message: 'It will disappear forever',
      });
    },
  }),
};

Partners.batchActions = {
  delete: new BatchAction(Partners.actions.delete, Partners.methods.batch.remove),
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.partner.create');
AutoForm.addModalHooks('af.partner.edit');
AutoForm.addModalHooks('af.partner.merge');

AutoForm.addHooks('af.partner.edit', {
  before: {
    'method-update'(modifier) {
      if (userUnlinkNeeded(this.currentDoc, modifier)) {
        Modal.confirmAndCall(Partners.methods.update, { _id: this.docId, modifier }, {
          action: 'edit',
          entity: 'partner',
          message: 'Changing partner email address will unlink user',
        }, (res) => { if (res) Modal.hide(this.template.parent()); });
        return false;
      }
      return modifier;
    },
  },
});
