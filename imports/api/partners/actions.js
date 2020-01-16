import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Partners } from './partners.js';
import './methods.js';

Partners.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
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
  notifyOutstanding: {
    name: 'notifyOutstanding',
    color(options, doc) {
      const expired = doc.highestExpiredBillDayCount();
      if (expired > 30 && expired < 90) return 'warning';
      if (expired > 90) return 'danger';
      return 'white';
    },
    icon: () => 'fa fa-exclamation',
    visible: (options, doc) => currentUserHasPermission('partners.notifyOutstanding', doc) && doc.highestExpiredBillDayCount(),
    run(options, doc) {
      Modal.confirmAndCall(Partners.methods.notifyOutstanding, { _id: doc._id }, {
        action: 'notify outstanding',
        message: 'It will send a notification',
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
