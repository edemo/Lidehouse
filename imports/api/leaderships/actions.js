import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Leaderships } from './leaderships.js';
import './methods.js';

Leaderships.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('leaderships.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.leadership.insert',
        collection: Leaderships,
        omitFields: ['parcelId', 'leadParcelId'],
        type: 'method',
        meteormethod: 'leaderships.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('leaderships.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.leadership.view',
        collection: Leaderships,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('leaderships.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.leadership.update',
        collection: Leaderships,
        omitFields: ['parcelId', 'leadParcelId'],
        doc,
        type: 'method-update',
        meteormethod: 'leaderships.update',
        singleMethodArgument: true,
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible: (options, doc) => currentUserHasPermission('leaderships.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.leadership.update',
        collection: Leaderships,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'leaderships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('leaderships.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Leaderships.methods.remove, { _id: doc._id }, {
        action: 'delete leadership',
        message: 'You should rather archive it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.leadership.insert');
AutoForm.addModalHooks('af.leadership.update');
AutoForm.addHooks('af.leadership.insert', {
  formToDoc(doc) {
    doc.communityId = getActiveCommunityId();
    doc.parcelId = Session.get('selectedParcelId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.leadership.update', {
  formToModifier(modifier) {
    delete modifier.$set.leadParcelId; // not working
    modifier.$set.communityId = getActiveCommunityId();
    return modifier;
  },
});
