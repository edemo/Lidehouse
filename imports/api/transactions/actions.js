import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { Transactions } from './transactions.js';
import './entities.js';
import './methods.js';

function txCatFromEntity(entity) {
  const category = entity.name;
  debugAssert(category === 'bill' || category === 'payment');
  const communityId = Session.get('activeCommunityId');
  const activePartnerRelation = Session.get('activePartnerRelation');
  const txCat = TxCats.findOne({ communityId, category, 'data.relation': activePartnerRelation });
  return txCat;
}

function fillMissingOptionParams(options) {
  if (options.entity) options.txCat = txCatFromEntity(options.entity);
  else if (options.txCat) options.entity = Transactions.entities[options.txCat.category];
  else debugAssert(false, 'Either entity or txCat needs to come in the options');
}

Transactions.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('transactions.insert', doc),
    run(options, doc) {
      fillMissingOptionParams(options);
      Session.update('modalContext', 'txCatId', options.txCat._id);
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
//      Session.update('modalContext', 'txCatId', doc.txCat()._id);
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
//      Session.update('modalContext', 'txCatId', doc.txCat()._id);
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

AutoForm.addModalHooks('af.transaction.view');
AutoForm.addModalHooks('af.transaction.insert');
AutoForm.addModalHooks('af.transaction.update');
AutoForm.addModalHooks('af.transaction.post');

AutoForm.addHooks('af.transaction.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.transaction.insert');
    const catId = Session.get('modalContext').txCatId;
    const cat = TxCats.findOne(catId);
    doc.catId = catId;
    cat.transformToTransaction(doc);
    const self = this;
    Transactions.methods.insert.call(doc, function handler(err, res) {
      if (err) {
//        displayError(err);
        self.done(err);
        return;
      }
      self.done(null, res);
    });
    return false;
  },
});
