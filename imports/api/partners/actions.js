import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Partners } from './partners.js';
import './methods.js';

Partners.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    color: () => 'primary',
    visible: (options, doc) => currentUserHasPermission('partners.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.partner.insert',
        collection: Partners,
        type: 'method',
        meteormethod: 'partners.insert',
      });
    },
  },
  import: {
    name: 'import',
    icon: () => 'fa fa-upload',
    visible: (options, doc) => currentUserHasPermission('partners.upsert', doc),
    run: () => importCollectionFromFile(Partners),
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('partners.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.partner.view',
        collection: Partners,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('partners.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.partner.update',
        collection: Partners,
        doc,
        type: 'method-update',
        meteormethod: 'partners.update',
        singleMethodArgument: true,
      });
    },
  },
  remindOutstandings: {
    name: 'remindOutstandings',
    color: (options, doc) => doc.mostOverdueDaysColor(),
    icon: () => 'fa fa-exclamation',
    visible: (options, doc) => currentUserHasPermission('partners.remindOutstandings', doc) && doc.mostOverdueDays(),
    run(options, doc) {
      Modal.confirmAndCall(Partners.methods.remindOutstandings, { _id: doc._id }, {
        action: 'remind outstandings',
        message: __('Sending outstandings reminder', doc.primaryEmail() || __('undefined')),
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('partners.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Partners.methods.remove, { _id: doc._id }, {
        action: 'delete partner',
        message: 'It will disappear forever',
      });
    },
  },
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.partner.insert');
AutoForm.addModalHooks('af.partner.update');

AutoForm.addHooks('af.partner.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
