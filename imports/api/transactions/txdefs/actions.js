import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Txdefs } from './txdefs.js';
import './methods.js';

Txdefs.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    color: 'primary',
    label: `${__('new')} ${__('txdef')}`,
    visible: user.hasPermission('accounts.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.insert',
        collection: Txdefs,
        type: 'method',
        meteormethod: 'txdefs.insert',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('accounts.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.txdef.update',
        collection: Txdefs,
        doc,
        type: 'method-update',
        meteormethod: 'txdefs.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('accounts.remove', doc),
    run() {
      Modal.confirmAndCall(Txdefs.methods.remove, { _id: doc._id }, {
        action: 'delete txdef',
      });
    },
  }),
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

