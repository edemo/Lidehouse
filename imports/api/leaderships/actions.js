import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Leaderships } from './leaderships.js';
import './methods.js';

Leaderships.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('leaderships.insert'),
    run() {
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('leaderships.inCommunity'),
    run(data, doc) {
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('leaderships.update'),
    run(data, doc) {
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('leaderships.update'),
    run(data, doc) {
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('leaderships.remove'),
    run(data) {
      Modal.confirmAndCall(Leaderships.methods.remove, { _id: data._id }, {
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
    doc.communityId = Session.get('selectedCommunityId');
    doc.parcelId = Session.get('selectedParcelId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.leadership.update', {
  formToModifier(modifier) {
    delete modifier.$set.leadParcelId; // not working
    modifier.$set.communityId = Session.get('selectedCommunityId');
    return modifier;
  },
});
