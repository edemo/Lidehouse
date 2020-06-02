/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { flatten } from 'flat';
import { UploadFS } from 'meteor/jalik:ufs';
import XLSX from 'xlsx';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { digestImportJsons } from '/imports/data-import/digest.js';
// import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/readmore.js';
import '/imports/ui_3/views/components/import-dialog.js';
import { __ } from '/imports/localization/i18n.js';

const rABS = true;

function singlify(jsons) {
  const tjsons = [];
  jsons.forEach(json => {
    _.each(json, (value, key) => {
      if (key.indexOf('(') !== -1) {
        // TODO
      }
    });
  });
  return tjsons;
}

const launchNextPhase = function launchNextPhase(vm) {
  const userId = Meteor.userId();
//  const communityId = getActiveCommunityId();
  const conductor = vm.conductor();
  const phase = conductor.nextPhase();
  if (!phase) return; // Import cycle ended
  const collection = phase.collection();
  Modal.show('Modal', {
    title: __('importing data', __(collection._name)),
    body: 'Import_preview',
    bodyContext: {},
    size: 'lg',
    btnOK: 'import',
    onOK() {
      const viewmodel = this;
      if (viewmodel.savingEnabled()) viewmodel.savePhase();
      const jsons = XLSX.utils.sheet_to_json(viewmodel.getImportableSheet(), { blankRows: false }).map(flatten.unflatten);
      const digest = digestImportJsons(jsons, phase);
      phase.docs = digest.docs;

      console.log(`Calling batch test on ${digest.tdocs.length} docs`);
      const neededOps = collection.methods.batch.test._execute({ userId }, { args: digest.tdocs });
      const tdocsToUpsert = _.reject(digest.tdocs, (d, i) => _.contains(neededOps.noChange, i));

      console.log(`Calling batch upsert on ${tdocsToUpsert.length} docs`);
      Modal.confirmAndCall(collection.methods.batch.upsert, { args: tdocsToUpsert }, {
        action: __('import data', { collection: __(collection._name) }),
        message: __('This operation will do the following') + '<br>'
          + __('creates') + ' ' + neededOps.insert.length + __(' documents') + ',<br>'
          + __('modifies') + ' ' + neededOps.update.length + __(' documents') + ',<br>'
          + __('deletes') + ' ' + neededOps.remove.length + __(' documents') + ',<br>'
          + __('leaves unchanged') + ' ' + neededOps.noChange.length + __(' documents'),
        body: 'Readmore',
        bodyContext: JSON.stringify(neededOps, null, 2),
      }, () => {
        launchNextPhase(viewmodel);
      });
    },
  }, {  // don't close this modal, when clicking outside
    backdrop: 'static',
    keyboard: false,
  });
};

Template.Import_upload.events({
  'click button[name=upload]'(event, instance) {
    UploadFS.selectFile(function (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        let data = e.target.result;
        if (!rABS) data = new Uint8Array(data);
        const workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' /*, cellDates: true*/ });
        instance.viewmodel.workbook(workbook);
        instance.viewmodel.conductor(instance.viewmodel.potentialConductor());
        Modal.hide();
        launchNextPhase(instance.viewmodel);
      };
      if (rABS) reader.readAsBinaryString(file);
      else reader.readAsArrayBuffer(file);
    });
  },
});

Template.Import_upload.events({
  'click button[name=download]'(event, instance) {
    const selectedColumns = instance.viewmodel.selectedColumns();
    const possibleColumns = instance.viewmodel.conductor().possibleColumns();
    const wb = XLSX.utils.book_new();
    const ws_data = [[], []]; // eslint-disable-line camelcase
    possibleColumns.forEach((colDef) => {
      if (!colDef.key) return;
      if (selectedColumns.length && !_.contains(selectedColumns, colDef.name)) return;
      ws_data[0].push(colDef.name);
      ws_data[1].push(colDef.example);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const ws_name = __('template'); // eslint-disable-line camelcase
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, `honline-${__('template')}-${__(instance.data.collection._name)}.xls`);
  },
});


export function importCollectionFromFile(mainCollection, options = {}) {
  Modal.show('Modal', {
    title: __('importing data', __(mainCollection._name)),
    body: 'Import_upload',
    bodyContext: { collection: mainCollection, options },
    size: 'lg',
  });
}
