import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { getActiveCommunityId, getActivePartnerId } from '/imports/ui_3/lib/active-community.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from './transactions.js';
import './entities.js';
import './methods.js';

function fillMissingOptionParams(options, doc) {
  const mcTxdef = Session.get('modalContext').txdef;
  if (mcTxdef && !options.txdef) options.txdef = mcTxdef; // This happens when new tx action is called from within statementEntry match action
    // TODO: Refactor. - entity data may come from so many places its confusing (options.entity, options.txdef, modalContext.txdef)
  if (typeof options.entity === 'string') options.entity = Transactions.entities[options.txdef.category];
  if (options.txdef && !options.entity) options.entity = Transactions.entities[options.txdef.category];
  debugAssert(options.entity && options.txdef, 'Either entity or txdef needs to come in the options');
}

Transactions.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('transactions.insert', doc),
    run(options, doc, event, instance) {
      fillMissingOptionParams(options, doc);
      Session.update('modalContext', 'txdef', options.txdef);
      const entity = options.entity;
      const insertTx = Session.get('modalContext').insertTx;
      doc = _.extend({}, insertTx, doc);
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.insert`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method',
        meteormethod: 'transactions.insert',
        // --- --- --- ---
        size: entity.size || 'md',
//        validation: entity.editForm ? 'blur' : undefined,
//        btnOK: `Insert ${entity.name}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => {
      const communityId = getActiveCommunityId();
      return currentUserHasPermission('transactions.inCommunity', doc)
        || getActivePartnerId() === doc.partnerId;
    },
    run(options, doc) {
      const entity = Transactions.entities[doc.entityName()];
      Session.update('modalContext', 'txdef', doc.txdef());
      Modal.show('Autoform_modal', {
        body: entity.viewForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.view`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'readonly',
        // --- --- --- ---
        size: entity.size || 'md',
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
      Session.update('modalContext', 'txdef', doc.txdef());
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.update`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method-update',
        meteormethod: 'transactions.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.size || 'md',
//        validation: entity.editForm ? 'blur' : undefined,
      });
    },
  },
  post: {
    name: 'post',
    icon: (options, doc) => ((doc && doc.isPosted()) ? 'fa fa-envelope' : 'fa fa-check-square-o'),
    color: (options, doc) => ((doc && doc.isPosted()) ? undefined : 'warning'),
    label: (options, doc) => ((doc && doc.isPosted()) ? 'repost' : 'post'),
    visible(options, doc) {
      if (!doc) return false;
      if (doc.category === 'bill' && !doc.hasConteerData()) return false;
      if (doc.isPosted()) return currentUserHasPermission('transactions.repost', doc);
      return currentUserHasPermission('transactions.post', doc);
    },
    run(options, doc) {
      if (doc.isPosted()) {
        Modal.confirmAndCall(Transactions.methods.post, { _id: doc._id }, {
          action: 'post transaction',
          message: 'This transaction has been already posted before',
        });

      } else {
        Transactions.methods.post.call({ _id: doc._id }, onSuccess((res) => {
          displayMessage('info', 'Szamla konyvelesbe kuldve');
        }));
      }
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
    run(options, doc, event, instance) {
      Session.update('modalContext', 'billId', doc._id);
      const txdef = Txdefs.findOne({ communityId: doc.communityId, category: 'payment', 'data.relation': doc.relation });
      Session.update('modalContext', 'txdef', txdef);
      const insertOptions = _.extend({}, options, { entity: Transactions.entities.payment });
      const insertTx = _.extend({}, doc, { txdef, valueDate: new Date() });
      delete insertTx.lines; delete insertTx.debit; delete insertTx.credit;
      delete insertTx.serial; delete insertTx.serialId;
      insertTx.bills = [{ id: doc._id, amount: doc.amount }];
      Transactions.actions.new.run(insertOptions, insertTx);
    },
  },
  registerRemission: {
    name: 'registerRemission',
    icon: () => 'fa fa-minus',
    visible(options, doc) {
      if (!doc) return false;
      if (!doc.isPosted()) return false;
      if (doc.category !== 'bill' || !doc.outstanding) return false;
      return currentUserHasPermission('transactions.insert', doc);
    },
    run(options, doc, event, instance) {
      Session.update('modalContext', 'billId', doc._id);
      const txdef = Txdefs.findOne({ communityId: doc.communityId, category: 'remission', 'data.relation': doc.relation });
      Session.update('modalContext', 'txdef', txdef);
      const remissionOptions = _.extend({}, options, { entity: Transactions.entities.remission });
      Transactions.actions.new.run(remissionOptions, doc);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('transactions.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete transaction',
        message: doc.isSolidified() ? 'Remove not possible after 24 hours' : 'It will disappear forever',
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
    docToForm(doc) {
      return doc;
    },
    formToDoc(doc) {
      const modalContext = Session.get('modalContext');
      doc.communityId = Session.get('activeCommunityId');
      doc.category = category;
      const txdef = modalContext.txdef;
      doc.defId = txdef._id;
      _.each(txdef.data, (value, key) => doc[key] = value);
      if (category === 'bill' || category === 'receipt') {
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'payment' || category === 'remission') {
        doc.bills = doc.bills || [];
        if (!doc.bills.length && modalContext.billId) {
          doc.bills = [{ id: modalContext.billId, amount: doc.amount }];
        }
        const billId = doc.bills[0].id;
        const bill = Transactions.findOne(billId);
        doc.relation = bill.relation;
        doc.partnerId = bill.partnerId;
        // on the server it will be checked all bills match
/*        _.each(doc.bills, (bp, index) => {
          const billId = bp.id;
          const bill = Transactions.findOne(billId);
          if (index === 0) {
            doc.relation = bill.relation;
            doc.partnerId = bill.partnerId;
            doc.membershipId = bill.membershipId;
            doc.contractId = bill.contractId;
          } else {
            productionAssert(doc.relation === bill.relation, 'All paid bills need to have same relation');
            productionAssert(doc.partnerId === bill.partnerId, 'All paid bills need to have same partner');
            productionAssert(doc.membershipId === bill.membershipId, 'All paid bills need to have same membership');
            productionAssert(doc.contractId === bill.contractId, 'All paid bills need to have same contract');
          }
        }); */
      }
      return doc;
    },
  });
});
