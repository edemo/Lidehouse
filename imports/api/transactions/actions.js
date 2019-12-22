import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { TxDefs } from '/imports/api/transactions/tx-defs/tx-defs.js';
import { Transactions } from './transactions.js';
import './entities.js';
import './methods.js';

function txDefFromEntity(entity, instance) {
  const category = entity.name;
  const communityId = Session.get('activeCommunityId');
  const partnerRelation = instance.viewmodel.activePartnerRelation();
  const txDef = TxDefs.findOne({ communityId, category, 'data.relation': partnerRelation });
  return txDef;
}

function fillMissingOptionParams(options, instance) {
  if (options.entity) options.txDef = txDefFromEntity(options.entity, instance);
  else if (options.txDef) options.entity = Transactions.entities[options.txDef.category];
  else debugAssert(false, 'Either entity or txDef needs to come in the options');
}

Transactions.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('transactions.insert', doc),
    run(options, doc, event, instance) {
      fillMissingOptionParams(options, instance);
      Session.update('modalContext', 'txDef', options.txDef);
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.insert`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields,
        doc,
        type: 'method',
        meteormethod: 'transactions.insert',
        // --- --- --- ---
        size: entity.editForm ? 'lg' : 'md',
        validation: entity.editForm ? 'blur' : undefined,
//        btnOK: `Insert ${entity.name}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('transactions.inCommunity', doc),
    run(options, doc) {
      const entity = Transactions.entities[doc.entityName()];
      Session.update('modalContext', 'txDef', doc.txDef());
      Modal.show('Autoform_modal', {
        body: entity.viewForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.view`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields,
        doc,
        type: 'readonly',
        // --- --- --- ---
        size: entity.viewForm ? 'lg' : 'md',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(options, doc) {
      if (!doc || doc.isPosted()) return false;
      return currentUserHasPermission('transactions.update', doc);
    },
    run(options, doc) {
      const entity = Transactions.entities[doc.entityName()];
      Session.update('modalContext', 'txDef', doc.txDef());
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.update`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'transactions.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.editForm ? 'lg' : 'md',
        validation: entity.editForm ? 'blur' : undefined,
      });
    },
  },
  post: {
    name: 'post',
    icon: () => 'fa fa-check-square-o',
    color: (options, doc) => ((doc && !doc.isPosted()) ? 'warning' : undefined),
    visible(options, doc) {
      if (!doc) return false;
      if (doc.isPosted()) return false;
      if (doc.category === 'bill' && !doc.hasConteerData()) return false;
      return currentUserHasPermission('transactions.post', doc);
    },
    run(options, doc) {
      Transactions.methods.post.call({ _id: doc._id }, onSuccess((res) => {
        displayMessage('info', 'Szamla konyvelesbe kuldve');
      }));
    },
  },
  registerPayment: {
    name: 'registerPayment',
    icon: () => 'fa fa-credit-card',
    visible(options, doc) {
      if (!doc) return false;
      if (!doc.isPosted()) return false;
      if (doc.category !== 'bill' || !doc.outstanding) return false;
      return currentUserHasPermission('transactions.insert', doc);
    },
    run(options, doc) {
      Session.update('modalContext', 'billId', doc._id);
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment });
      Transactions.actions.new.run(paymentOptions, doc);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('transactions.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete transaction',
        message: doc.isSolidified() ? 'Remove not possible after 24 hours' : '',
      });
    },
  },
};

Transactions.batchActions = {
  post: new BatchAction(Transactions.actions.post, Transactions.methods.batch.post),
  delete: new BatchAction(Transactions.actions.delete, Transactions.methods.batch.remove),
};

//-------------------------------------------------

Transactions.categoryValues.forEach(category => {
  AutoForm.addModalHooks(`af.${category}.view`);
  AutoForm.addModalHooks(`af.${category}.insert`);
  AutoForm.addModalHooks(`af.${category}.update`);

  AutoForm.addHooks(`af.${category}.insert`, {
    formToDoc(doc) {
      doc.communityId = Session.get('activeCommunityId');
      doc.category = category;
      const txDef = Session.get('modalContext').txDef;
      doc.relation = txDef.data.relation;
      doc.catId = txDef._id;
      if (category === 'bill') {
        doc.valueDate = doc.deliveryDate;
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'receipt') {
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'payment') {
        const billId = Session.get('modalContext').billId;
        if (billId) {
          const bill = Transactions.findOne(billId);
          doc.relation = bill.relation;
          doc.partnerId = bill.partnerId;
          doc.billId = billId;
        }
      }
      return doc;
    },
  });
});
