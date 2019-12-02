import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Transactions } from './transactions.js';
import './methods.js';

Transactions.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('transactions.insert'),
    run(options) {
      Session.set('activeTxCatId', options.entity);
      const cat = TxCats.findOne(options.entity);
      Modal.show('Autoform_edit', {
        id: 'af.transaction.insert',
        collection: Transactions,
        schema: cat.schema(),
  //      type: 'method',
  //      meteormethod: 'transactions.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('transactions.inCommunity'),
    run(options, doc) {
      Modal.show('Autoform_edit', {
        id: 'af.transaction.view',
        collection: Transactions,
        schema: Transactions.inputSchema,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('transactions.update'),
    run(options, doc) {
      Modal.show('Autoform_edit', {
        id: 'af.transaction.update',
        collection: Transactions,
  //      schema: newTransactionSchema(),
        doc,
        type: 'method-update',
        meteormethod: 'transactions.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: () => currentUserHasPermission('transactions.remove'),
    run(options, doc) {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete transaction',
        message: doc.isSolidified() ? 'Remove not possible after 24 hours' : '',
      });
    },
  },
};

//-------------------------------------------------

AutoForm.addModalHooks('af.transaction.view');
AutoForm.addModalHooks('af.transaction.insert');
AutoForm.addModalHooks('af.transaction.update');

AutoForm.addHooks('af.transaction.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.transaction.insert');
    const catId = Session.get('activeTxCatId');
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
