import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { TxDefs } from './txdefs.js';
import './methods.js';

TxDefs.actions = {
  new: {
    name: 'new',
    icon: 'fa fa-plus',
    visible: () => currentUserHasPermission('breakdowns.insert'),
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
    visible: () => currentUserHasPermission('breakdowns.update'),
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
    visible: () => currentUserHasPermission('breakdowns.remove'),
    run(id) {
      Modal.confirmAndCall(TxDefs.methods.remove, { _id: id }, {
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

