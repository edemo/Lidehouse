/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { flatten } from 'flat';
import { UploadFS } from 'meteor/jalik:ufs';
import XLSX from 'xlsx';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { displayError } from '/imports/ui_3/lib/errors.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/readmore.js';
import '/imports/ui_3/views/components/import-dialog.js';
import { __ } from '/imports/localization/i18n.js';
import { Settings } from '/imports/api/settings/settings.js';
import { Translator } from './translator.js';
import { Parser } from './parser.js';
import { Transformers } from './transformers.js';
import { getCollectionsToImport } from './conductors.js';

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

Template.Import_dialog.events({
  'click button[name=upload]'(event, instance) {
    UploadFS.selectFile(function (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        let data = e.target.result;
        if (!rABS) data = new Uint8Array(data);
        const workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' /*, cellDates: true*/ });
        const sheetName = workbook.SheetNames[0]; // importing only the first sheet
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet, { editable: true });
        instance.viewmodel.table(html);
      };
      if (rABS) reader.readAsBinaryString(file);
      else reader.readAsArrayBuffer(file);
    });
  },
});

Template.Import_upload.events({
  'click button[name=download]'(event, instance) {
    const selected = instance.viewmodel.selected();
    const columns = instance.parent().data.columns;
    const wb = XLSX.utils.book_new();
    const ws_data = [[], []]; // eslint-disable-line camelcase
    columns.forEach((colDef) => {
      if (!colDef.key) return;
      if (selected.length && !_.contains(selected, colDef.name)) return;
      ws_data[0].push(colDef.name);
      ws_data[1].push(colDef.example);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const ws_name = __('template'); // eslint-disable-line camelcase
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, `honline-${__('template')}-${__(instance.parent().data.collection._name)}.xls`);
  },
});


export function importCollectionFromFile(mainCollection, options) {
  const user = Meteor.user();
  const communityId = getActiveCommunityId();
  const collectionsToImport = getCollectionsToImport(mainCollection, options);
  const columns = [{ display: __('importColumnsInstructions') }];
  collectionsToImport.forEach((cti, ind) => {
    const translator = cti.translator;
    columns.push({ name: ind, display: `${translator.__('_')} ${__('data')}`.toUpperCase() });
    _.each(cti.schema._schema, (value, key) => {
      const split = key.split('.');
      if (_.contains(['Array', 'Object'], value.type.name)) return;
      if (value.autoform && (value.autoform.omit || value.autoform.readonly || _.contains(['hidden'], value.autoform.type))) return;
      if (_.contains(split, 'activeTime')) return;
      if (_.contains(cti.omitFields, key)) return;
      if (!value.label) return;
      const name = translator.__(key);
      const example = translator.example(key, value);
      const display = `[${name}]${value.optional ? '' : '(*)'}: ${value.type.name} ${example}`;
      columns.push({ key, name, example, display });
    });
    _.each(cti.translator.dictionary, (value, key) => {
      if (value.depends) {
        const i = columns.findIndex(c => c.key === key);
        if (i >= 0) columns.splice(i, 1);
        value.depends.forEach(name => {
          if (columns.find(c => c.name === name)) return;
          const display = `[${name}](*)`;
          columns.push({ key: name, name, example: '', display });
        });
      }
    });
  });

  Modal.show('Modal', {
    title: 'importing data',
    body: 'Import_dialog',
    bodyContext: { collection: mainCollection, options, columns },
    size: 'lg',
    btnAction: 'import',
    btnClose: 'cancel',
    onAction() {
      const viewmodel = this;
      viewmodel.buttonsAreDisabled(true);
      Meteor.setTimeout(() => { // We defer, so the button disable happens before the long processing
        const importTable = $('.import-table')[0];
        const importSheet = XLSX.utils.table_to_sheet(importTable /*, { cellDates: true }*/);
        const jsons = XLSX.utils.sheet_to_json(importSheet).map(flatten.unflatten);

        let docs = jsons;
        const processNextCollection = function () {
          const collectionToImport = collectionsToImport.shift();
          if (!collectionToImport) { // Import cycle ended - can close import dialog here
            Meteor.setTimeout(() => $('.modal').modal('hide'), 500);
            if (viewmodel.saveColumnMapppings()) {
              const _id = Settings.ensureExists();
              const mapping = _.extend({}, viewmodel.columnMapping());
              Settings.update(_id, { $set: { [`columnMappings.${mainCollection._name}`]: mapping } });
            }
            return;
          }
          const collection = collectionToImport.collection;
    //      if (options && options.multipleDocsPerLine) docs = singlify(docs);
          const translator = collectionToImport.translator;
          if (translator) {
            docs = translator.reverse(docs);
            translator.applyDefaults(docs);
          }
          // --- Custom transformation is applied to the docs, that may even change the set of docs
          const transformer = Transformers[collection._name]?.[(options && options.transformer) || 'default'];
          const tdocs = transformer ? transformer(docs, options) : docs;
          const parser = new Parser(collectionToImport.schema);
          tdocs.forEach(doc => { parser.parse(doc); doc.communityId = communityId; });
          // console.log(collection._name, tdocs);
          if (!tdocs.length) { processNextCollection(); return; } // nothing to do with this collection, handle the next

          collection.methods.batch.test.call({ args: tdocs }, function (err, res) {
            if (err) { displayError(err); return; }
            const neededOps = res;
            Modal.confirmAndCall(collection.methods.batch.upsert, { args: tdocs }, {
              action: __('import data', { collection: __(collection._name) }),
              message: __('This operation will do the following') + '<br>'
                + __('creates') + ' ' + neededOps.insert.length + __(' documents') + ',<br>'
                + __('modifies') + ' ' + neededOps.update.length + __(' documents') + ',<br>'
                + __('deletes') + ' ' + neededOps.remove.length + __(' documents') + ',<br>'
                + __('leaves unchanged') + ' ' + neededOps.noChange.length + __(' documents'),
              body: 'Readmore',
              bodyContext: JSON.stringify(neededOps, null, 2),
            }, processNextCollection);
          });
        };
        processNextCollection();
      }, 500);
    },
  });
}
