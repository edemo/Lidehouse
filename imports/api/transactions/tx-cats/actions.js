import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { TxCats } from './tx-cats.js';
import './methods.js';

TxCats.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('breakdowns.insert'),
    run() {
      Modal.show('Autoform_edit', {
        id: 'af.txCat.insert',
        collection: TxCats,
        type: 'method',
        meteormethod: 'txCats.insert',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('breakdowns.update'),
    run(data, doc) {
      Modal.show('Autoform_edit', {
        id: 'af.txCat.update',
        collection: TxCats,
        doc,
        type: 'method-update',
        meteormethod: 'txCats.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: () => currentUserHasPermission('breakdowns.remove'),
    run(data) {
      Modal.confirmAndCall(TxCats.methods.remove, { _id: data._id }, {
        action: 'delete txCat',
      });
    },
  },
};

//------------------------------------------------------

AutoForm.addModalHooks('af.txCat.insert');
AutoForm.addModalHooks('af.txCat.update');

AutoForm.addHooks('af.txCat.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

