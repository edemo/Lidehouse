import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Parcelships } from './parcelships.js';
import './methods.js';

Parcelships.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    label: () => __('new') + ' ' + __('parcelship'),
    visible: (options, doc) => currentUserHasPermission('parcelships.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.insert',
        collection: Parcelships,
        omitFields: ['parcelId'],
        type: 'method',
        meteormethod: 'parcelships.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('parcelships.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.view',
        collection: Parcelships,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('parcelships.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.update',
        collection: Parcelships,
        omitFields: ['parcelId', 'leadParcelId'],
        doc,
        type: 'method-update',
        meteormethod: 'parcelships.update',
        singleMethodArgument: true,
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible: (options, doc) => currentUserHasPermission('parcelships.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelship.update',
        collection: Parcelships,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'parcelships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('parcelships.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Parcelships.methods.remove, { _id: doc._id }, {
        action: 'delete parcelship',
        message: 'You should rather archive it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.parcelship.insert');
AutoForm.addModalHooks('af.parcelship.update');
AutoForm.addHooks('af.parcelship.insert', {
  formToDoc(doc) {
    doc.communityId = getActiveCommunityId();
    doc.parcelId = Session.get('modalContext').parcelId;
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.parcelship.update', {
  formToModifier(modifier) {
    delete modifier.$set.leadParcelId; // not working
    modifier.$set.communityId = getActiveCommunityId();
    return modifier;
  },
});
