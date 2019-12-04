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
    visible: (options, doc) => currentUserHasPermission('breakdowns.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
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
    visible: (options, doc) => currentUserHasPermission('breakdowns.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
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
    visible: (options, doc) => currentUserHasPermission('breakdowns.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(TxCats.methods.remove, { _id: doc._id }, {
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

