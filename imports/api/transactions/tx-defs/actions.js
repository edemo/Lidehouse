import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { TxDefs } from './tx-defs.js';
import './methods.js';

TxDefs.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('breakdowns.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txDef.insert',
        collection: TxDefs,
        type: 'method',
        meteormethod: 'txDefs.insert',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('breakdowns.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.txDef.update',
        collection: TxDefs,
        doc,
        type: 'method-update',
        meteormethod: 'txDefs.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('breakdowns.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(TxDefs.methods.remove, { _id: doc._id }, {
        action: 'delete txDef',
      });
    },
  },
};

//------------------------------------------------------

AutoForm.addModalHooks('af.txDef.insert');
AutoForm.addModalHooks('af.txDef.update');

AutoForm.addHooks('af.txDef.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

