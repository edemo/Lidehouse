import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import { __ } from '/imports/localization/i18n.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Meters } from '/imports/api/meters/meters.js';
import '/imports/api/meters/actions.js';
import { MeterReadings } from './meter-readings.js';
import './methods.js';

MeterReadings.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: __('new') + ' ' + __('entities.meterReading.label'),
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('meters.registerReading', doc),
    run() {
      const meterId = ModalStack.getVar('meterId');
      const meter = Meters.findOne(meterId);
      Meters.actions.registerReading(options, meter, user).run();
/*      Modal.show('Autoform_modal', {
        id: 'af.meterReading.create',
        collection: MeterReadings,
        doc,
        type: 'method',
        meteormethod: 'metersReadings.insert',
      });*/
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('meterReadings.upsert', doc),
    run: () => importCollectionFromFile(MeterReadings),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: doc.type === 'reading' && user.hasPermission('parcels.details', doc.meter().parcel()),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.meterReading.view',
        collection: MeterReadings,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('meterReadings.update', doc) && doc.date > doc.meter().lastBilling().date,
    run() {
      const omitFields = user.hasPermission('meterReadings.update', doc) ? undefined : ['approved'];
      Modal.show('Autoform_modal', {
        id: 'af.meterReading.edit',
        collection: MeterReadings,
        omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'meterReadings.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('meterReadings.remove', doc) && doc.date > doc.meter().lastBilling().date,
    run() {
      Modal.confirmAndCall(MeterReadings.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'meterReading',
        message: 'You should rather archive it',
      });
    },
  }),
};

MeterReadings.batchActions = {
  delete: new BatchAction(MeterReadings.actions.delete, MeterReadings.methods.batch.remove),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.meterReading.create');
AutoForm.addModalHooks('af.meterReading.edit');
AutoForm.addHooks('af.meterReading.create', {
  formToDoc(doc) {
    doc.meterId = ModalStack.getVar('meterId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.meterReading.edit', {
  formToModifier(modifier) {
    //    modifier.$set.approved = true;
    return modifier;
  },
});
