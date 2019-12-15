import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Meters } from './meters.js';
import './methods.js';

Meters.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('meters.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meter.insert',
        collection: Meters,
        omitFields: ['readings'],
        type: 'method',
        meteormethod: 'meters.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('meters.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.meter.view',
        collection: Meters,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('meters.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.meter.update',
        collection: Meters,
        omitFields: ['readings', 'activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'meters.update',
        singleMethodArgument: true,
      });
    },
  },
  editReadings: {
    name: 'editReadings',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('meters.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.meter.update',
        collection: Meters,
        fields: ['readings'],
        doc,
        type: 'method-update',
        meteormethod: 'meters.update',
        singleMethodArgument: true,
      });
    },
  },
  reading: {
    name: 'reading',
    icon: () => 'fa fa-camera',
    visible: (options, doc) => currentUserHasPermission('meters.registerReading', doc),
    run(options, doc) {
      Session.set('selectedMeterId', doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.meter.reading',
        collection: Meters,
        schema: Meters.registerReadingSchema,
        type: 'method',
        meteormethod: 'meters.registerReading',
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible: (options, doc) => currentUserHasPermission('meters.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.meter.update',
        collection: Meters,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'meters.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('meters.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Meters.methods.remove, { _id: doc._id }, {
        action: 'delete meter',
        message: 'You should rather archive it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.meter.insert');
AutoForm.addModalHooks('af.meter.update');
AutoForm.addModalHooks('af.meter.reading');
AutoForm.addHooks('af.meter.insert', {
  formToDoc(doc) {
    doc.communityId = getActiveCommunityId();
    doc.parcelId = Session.get('selectedParcelId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.meter.update', {
  formToModifier(modifier) {
    //    modifier.$set.approved = true;
    return modifier;
  },
});
AutoForm.addHooks('af.meter.reading', {
  formToDoc(doc) {
    doc._id = Session.get('selectedMeterId');
    return doc;
  },
});
