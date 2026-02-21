import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import { __ } from '/imports/localization/i18n.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Meters } from './meters.js';
import { MeterReadings } from './meter-readings/meter-readings.js';
import '/imports/ui_3/views/components/meter-readings.js';
import './methods.js';

Meters.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: __('new') + ' ' + __('entities.meter.label'),
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('meters.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meter.create',
        collection: Meters,
        doc,
        type: 'method',
        meteormethod: 'meters.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('meters.upsert', doc),
    run: () => importCollectionFromFile(Meters),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('parcels.details', doc.parcel()),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meter.view',
        collection: Meters,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('meters.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meter.edit',
        collection: Meters,
        doc,
        type: 'method-update',
        meteormethod: 'meters.update',
        singleMethodArgument: true,
      });
    },
  }),
  editReadings: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'editReadings',
    icon: 'fa fa-pencil-square-o',
    visible: user.hasPermission('meters.update', doc),
    run() {
      ModalStack.setVar('meterId', doc._id);
      Modal.show('Modal', {
        id: 'meterReading.view',
        title: `${doc?.identifier} (${doc.service}) ${__('meterReadings')}`,
        description: __('editMeterReadingsWarning', doc),
        body: 'Meter_readings',
        bodyContext: { meter: doc },
        size: 'md',
      });
    },
  }),
  registerReading: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'registerReading',
    icon: 'fa fa-camera',
    color: doc.lastReadingColor(),
    visible: user.hasPermission('meters.registerReading', doc) || user.hasPermission('meters.registerReading.unapproved', doc),
    run() {
      ModalStack.setVar('meterId', doc._id);
      const omitFields = user.hasPermission('meters.registerReading', doc) ? undefined : ['reading.approved'];
      Modal.show('Autoform_modal', {
        id: 'af.meter.registerReading',
        schema: MeterReadings.registerReadingSchema,
        omitFields,
        doc,
        type: 'method',
        meteormethod: 'meters.registerReading',
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('meters.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meter.edit',
        collection: Meters,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'meters.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('meters.remove', doc),
    run() {
      Modal.confirmAndCall(Meters.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'meter',
        message: 'You should rather archive it',
      });
    },
  }),
};

Meters.batchActions = {
  delete: new BatchAction(Meters.actions.delete, Meters.methods.batch.remove),
};

//-----------------------------------------------

function isTooLargeValue(doc) {
  const meter = Meters.findOne(doc._id);
  const estimatedValue = meter.getEstimatedValue();
  if (estimatedValue > 0 && doc.reading.value > (estimatedValue * 9)) return true;
  return false;
}

AutoForm.addModalHooks('af.meter.create');
AutoForm.addModalHooks('af.meter.edit');
AutoForm.addModalHooks('af.meter.editReadings');
AutoForm.addModalHooks('af.meter.registerReading');
AutoForm.addHooks('af.meter.create', {
  formToDoc(doc) {
    doc.parcelId = ModalStack.getVar('parcelId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.meter.edit', {
  formToModifier(modifier) {
    //    modifier.$set.approved = true;
    return modifier;
  },
});
AutoForm.addHooks('af.meter.registerReading', {
  formToDoc(doc) {
    doc._id = ModalStack.getVar('meterId');
    if (isTooLargeValue(doc)) {
      Modal.confirmAndCall(Meters.methods.registerReading, doc, {
        action: 'registerReading',
        entity: 'meter',
        message: 'The reading is much higher than expected',
      }, (res) => { if (res) Modal.hide(this.template.parent()); });
      return false;
    }
    return doc;
  },
});
