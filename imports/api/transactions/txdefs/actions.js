import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Txdefs } from './txdefs.js';
import './methods.js';

Txdefs.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('breakdowns.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.insert',
        collection: Txdefs,
        type: 'method',
        meteormethod: 'txdefs.insert',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('breakdowns.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.update',
        collection: Txdefs,
        doc,
        type: 'method-update',
        meteormethod: 'txdefs.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('breakdowns.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Txdefs.methods.remove, { _id: doc._id }, {
        action: 'delete txdef',
      });
    },
  },
};

//------------------------------------------------------

AutoForm.addModalHooks('af.txdef.insert');
AutoForm.addModalHooks('af.txdef.update');

AutoForm.addHooks('af.txdef.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

