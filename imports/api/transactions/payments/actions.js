import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Payments } from '../payments/payments.js';
import { TxCats } from '../tx-cats/tx-cats.js';
import { Bills } from '../bills/bills.js';
import { BatchAction } from '/imports/api/batch-action.js';
import './methods.js';

function setSessionVars(instance) {
  const communityId = Session.get('activeCommunityId');
  const activePartnerRelation = Session.get('activePartnerRelation');
  const txCat = TxCats.findOne({ communityId, dataType: 'payments', 'data.relation': activePartnerRelation });
  Session.set('activeTxCatId', txCat);
}

function clearSessionVars() {
  Session.set('activeTxCatId');
}

Payments.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('payments.insert', doc),
    run(options, doc, event, instance) {
      setSessionVars(instance);
      Modal.show('Autoform_modal', {
        id: 'af.payment.insert',
        collection: Payments,
        type: 'method',
        meteormethod: 'payments.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('payments.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.payment.view',
        collection: Payments,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(options, doc) {
      if (!currentUserHasPermission('bills.update', doc)) return false;
      if (!doc || doc.txId) return false; // already in accounting
      return true;
    },
    run(options, doc, event, instance) {
      setSessionVars(instance);
      Modal.show('Autoform_modal', {
        id: 'af.payment.update',
        collection: Payments,
        doc,
        type: 'method-update',
        meteormethod: 'payments.update',
        singleMethodArgument: true,
      });
    },
  },
  post: {
    name: 'post',
    icon: () => 'fa fa-check-square-o',
    color: (options, doc) => (!(doc.txId) ? 'warning' : undefined),
    visible(options, doc) {
      if (!currentUserHasPermission('payments.post', doc)) return false;
      if (!doc || doc.txId) return false;
      return true;
    },
    run(options, doc) {
      Payments.methods.post.call({ _id: doc._id }, onSuccess((res) => {
        displayMessage('info', 'Kifizetes konyvelesbe kuldve');
      }));
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('payments.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Payments.methods.remove, { _id: doc._id }, {
        action: 'delete bill',
        message: 'It will disappear forever',
      });
    },
  },
};

Payments.batchActions = {
  post: new BatchAction(Payments.actions.post, Payments.methods.batch.post),
  delete: new BatchAction(Payments.actions.delete, Payments.methods.batch.remove),
};

//--------------------------------------------------

AutoForm.addModalHooks('af.payment.insert');
AutoForm.addModalHooks('af.payment.update');
AutoForm.addModalHooks('af.payment.post');

AutoForm.addHooks('af.payment.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    const billId = Session.get('activeBillId');
    if (billId) {
      const bill = Bills.findOne(billId);
      doc.relation = bill.relation;
      doc.partnerId = bill.partnerId;
      doc.billId = billId;
    } else {
      doc.relation = Session.get('activePartnerRelation');
    }
    Session.set('activeBillId', undefined);
    return doc;
  },
  after: { 'method': clearSessionVars },
});

AutoForm.addHooks('af.payment.update', {
  after: { 'method-update': clearSessionVars },
});
