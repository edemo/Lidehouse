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
import { getConductor } from './conductors.js';

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

const launchNextPhase = function launchNextPhase(instance) {
  const userId = Meteor.userId();
  const communityId = getActiveCommunityId();
  const conductor = instance.data.conductor;
  const phase = conductor.nextPhase();
  if (!phase) { // Import cycle ended - can close import dialog here
    Meteor.setTimeout(() => $('.modal').modal('hide'), 500);
    return;
  }
  Modal.show('Modal', {
    title: 'importing data',
    body: 'Import_preview',
    bodyContext: instance.data,
    size: 'lg',
    btnOK: 'import',
    onOK() {
      const viewmodel = this;
      if (viewmodel.saveColumnMapppings()) {
        const mapping = _.extend({}, viewmodel.columnMapping());
        Settings.set(`import.${conductor.name}.${conductor.phaseIndex}.columnMapping`, mapping);
      }
      const editedTable = viewmodel.getTable();
      const editedSheet = XLSX.utils.table_to_sheet(editedTable /*, { cellDates: true }*/);
      const worksheet = viewmodel.worksheet();
      _.each(worksheet, (cell, key) => {
        if (key.length === 2 && key[1] === '1') { // so if header cell (A1, B1, ..., Z1)
          worksheet[key] = editedSheet[key];
        }
      });
      const jsons = XLSX.utils.sheet_to_json(worksheet, { /*header: 1,*/ blankRows: false }).map(flatten.unflatten);
      let docs = jsons; // .map(j => { const j2 = {}; $.extend(true, j2, j); return j2; }); // deep copy

      const collection = phase.collection();
      console.log(`Importing into ${collection._name}`);
//      if (options && options.multipleDocsPerLine) docs = singlify(docs);
      const translator = phase.translator();
      if (translator) {
        console.log(`Tranlsating ${docs.length} docs`);
        docs = translator.reverse(docs);
        console.log(`Applying defaults to ${docs.length} docs`);
        translator.applyDefaults(docs);
      }
      const parser = new Parser(phase.schema());
      console.log(`Parsing ${docs.length} docs`);
      docs.forEach(doc => { parser.parse(doc); });
      // --- Custom transformation is applied to the docs, that may even change the set of docs
      console.log(`Transforming ${docs.length} docs`);
      const transformer = phase.transformer();
      const tdocs = transformer(docs);
      // console.log(collection._name, tdocs);
      tdocs.forEach(doc => {
        collection.simpleSchema(doc).clean(doc);
        collection.simpleSchema(doc).validate(doc);
      });
      phase.docs = tdocs;

      console.log(`Calling batch test on ${tdocs.length} docs`);
      const neededOps = collection.methods.batch.test._execute({ userId }, { args: tdocs });
      const tdocsToUpsert = _.reject(tdocs, (d, i) => _.contains(neededOps.noChange, i));
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
        launchNextPhase(instance);
      });
    },
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
        const sheetName = workbook.SheetNames[0]; // importing only the first sheet
        const worksheet = workbook.Sheets[sheetName];
        instance.viewmodel.worksheet(worksheet);
        const html = XLSX.utils.sheet_to_html(worksheet, { editable: true });
        instance.viewmodel.table(html);
        Modal.hideAll();
        launchNextPhase(instance);
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


export function importCollectionFromFile(mainCollection, options = {}) {
  options.format = options.format || 'default';
  const conductor = getConductor(mainCollection, options);
  const columns = [{ display: __('importColumnsInstructions') }];
  conductor.phases.forEach((phase, phaseIndex) => {
    const translator = phase.translator();
    columns.push({ name: phaseIndex, display: `${translator.__('_')} ${__('data')}`.toUpperCase() });
    _.each(phase.schema()._schema, (value, key) => {
      const split = key.split('.');
      if (_.contains(['Array', 'Object'], value.type.name)) return;
      if (value.autoform && (value.autoform.omit || value.autoform.readonly || _.contains(['hidden'], value.autoform.type))) return;
      if (_.contains(split, '$')) return;
      if (_.contains(split, 'activeTime')) return;
      if (_.contains(phase.omitFields, key)) return;
      if (!value.label) return;
      const name = translator.__(key);
      const example = translator.example(key, value);
      const display = `[${name}]${value.optional ? '' : '(*)'}: ${value.type.name} ${example}`;
      columns.push({ key, name, example, display });
    });
    _.each(phase.translator().dictionary, (value, key) => {
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
    body: 'Import_upload',
    bodyContext: { collection: mainCollection, options, conductor, columns },
    size: 'lg',
  });
}
