import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TxDefs } from './txdefs.js';
import './methods.js';

export function allTxDefsActions() {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  TxDefs.actions = TxDefs.actions || {
    collection: TxDefs,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      permission: user.hasPermission('breakdowns.insert', communityId),
      run() {
        Modal.show('Autoform_edit', {
          id: 'af.txDef.insert',
          collection: TxDefs,
          type: 'method',
          meteormethod: 'txDefs.insert',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      permission: user.hasPermission('breakdowns.update', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.txDef.update',
          collection: TxDefs,
          doc: TxDefs.findOne(id),
          type: 'method-update',
          meteormethod: 'txDefs.update',
          singleMethodArgument: true,
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      permission: user.hasPermission('breakdowns.remove', communityId),
      run(id) {
        Modal.confirmAndCall(TxDefs.methods.remove, { _id: id }, {
          action: 'delete txDef',
        });
      },
    },
  };
  return TxDefs.actions;
}

export function getTxDefsActionsSmall() {
  allTxDefsActions();
  const actions = [
    TxDefs.actions.edit,
    TxDefs.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.txDef.insert');
AutoForm.addModalHooks('af.txDef.update');

AutoForm.addHooks('af.txDef.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

