import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/bill-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Bills } from './bills.js';
import { Payments } from '../payments/payments.js';
import { TxCats } from '../tx-cats/tx-cats.js';

import './methods.js';

function setSessionVars(instance) {
  const communityId = Session.get('activeCommunityId');
  const activePartnerRelation = instance.viewmodel.activePartnerRelation();
  const txCat = TxCats.findOne({ communityId, dataType: 'bills', 'data.relation': activePartnerRelation });
  Session.set('activeTxCatId', txCat);
}

function clearSessionVars() {
  Session.set('activeTxCatId');
}

Bills.actions = {
  new: {
    name: 'new',
    icon: 'fa fa-plus',
    visible: () => currentUserHasPermission('bills.insert'),
    run(id, event, instance) {
      setSessionVars(instance);
      Modal.show('Bill_edit', {
        id: 'af.bill.insert',
        collection: Bills,
        type: 'method',
        meteormethod: 'bills.insert',
        validation: 'blur',
      });
    },
  },
  view: {
    name: 'view',
    icon: 'fa fa-eye',
    visible: () => currentUserHasPermission('bills.inCommunity'),
    run(id) {
      const doc = Bills.findOne(id);
//    FlowRouter.go('Bill show', { _bid: id });
      Modal.show('Modal', {
        title: __(doc.relation + '_bill') + ' ' + doc.serialId(),
        body: 'Bill_show',
        bodyContext: { doc },
      });
    },
  },
  edit: {
    name: 'edit',
    icon: 'fa fa-pencil',
    visible(id) {
      if (!currentUserHasPermission('bills.update')) return false;
      const doc = Bills.findOne(id);
      if (doc.txId) return false; // already in accounting
      return true;
    },
    run(id, event, instance) {
      setSessionVars(instance);
      Modal.show('Bill_edit', {
        id: 'af.bill.update',
        collection: Bills,
        doc: Bills.findOne(id),
        type: 'method-update',
        meteormethod: 'bills.update',
        singleMethodArgument: true,
      });
    },
  },
  post: {
    name: 'post',
    icon: 'fa fa-check-square-o',
    color: _id => (!(Bills.findOne(_id).txId) ? 'warning' : undefined),
    visible(id) {
      if (!currentUserHasPermission('bills.post')) return false;
      const doc = Bills.findOne(id);
      return (doc.hasConteerData() && !doc.txId);
    },
    run(id) {
      Bills.methods.post.call({ _id: id }, onSuccess((res) => {
        displayMessage('info', 'Szamla konyvelesbe kuldve');
      }));
    },
  },
  registerPayment: {
    name: 'registerPayment',
    icon: 'fa fa-credit-card',
    visible(id) {
      if (!currentUserHasPermission('payments.insert')) return false;
      const doc = Bills.findOne(id);
      return (!!doc.txId && doc.outstanding > 0);
    },
    run(id) {
      Session.set('activeBillId', id);
      Modal.show('Autoform_edit', {
        id: 'af.payment.insert',
        collection: Payments,
        omitFields: ['partnerId'],
        type: 'method',
        meteormethod: 'payments.insert',
      });
    },
  },
  delete: {
    name: 'delete',
    icon: 'fa fa-trash',
    visible: () => currentUserHasPermission('bills.remove'),
    run(id) {
      Modal.confirmAndCall(Bills.methods.remove, { _id: id }, {
        action: 'delete bill',
        message: 'It will disappear forever',
      });
    },
  },
};

Bills.batchActions = {
  post: new BatchAction(Bills.actions.post, Bills.methods.batch.post),
  delete: new BatchAction(Bills.actions.delete, Bills.methods.batch.remove),
};

//------------------------------------------

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');
AutoForm.addModalHooks('af.bill.post');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.relation = Session.get('activePartnerRelation');
    doc.lines = _.without(doc.lines, undefined);
    Bills.autofillLines(doc);
    return doc;
  },
  after: { 'method': clearSessionVars },
});

AutoForm.addHooks('af.bill.update', {
  after: { 'method-update': clearSessionVars },
});
