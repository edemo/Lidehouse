import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ViewModel } from 'meteor/manuel:viewmodel';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { flatten } from 'flat';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { UploadFS } from 'meteor/jalik:ufs';
import XLSX from 'xlsx';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { doubleScroll } from '/imports/ui_3/lib/double-scroll.js';
import { Settings } from '/imports/api/settings/settings.js';
import { Conductors, getConductor } from '/imports/data-import/conductors.js';
import { digestImportJsons } from '/imports/data-import/digest.js';
import '/imports/ui_3/views/blocks/help-icon.js';
import '/imports/ui_3/views/blocks/readmore.js';
import '/imports/ui_3/views/modals/confirmation.js';
import './import-dialog.html';

const rABS = true;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVXYZ';

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

export function importCollectionFromFile(mainCollection, options = {}) {
  Modal.show('Modal', {
    title: __('importing data', __(mainCollection._name)),
    body: 'Import_upload',
    bodyContext: { collection: mainCollection, options },
    size: 'lg',
  });
}

//--------------------------------------------

ViewModel.share({
  import: {
    workbook: null,
    sheetName: '',
    columnMapping: {},
    savingEnabled: false,
    usedColumns: [],
    conductor: null,
//    headerRow: 0,
//    headerRowOptions() {
//      return [
//        { value: -1, label: '---' },
//        { value: 0, label: '1.' },
//        { value: 1, label: '2.' },
//      ];
//    },
    possibleColumns() {
      return _.without(_.pluck(this.conductor().possibleColumns(), 'name'), undefined);
    },
    availableColumns() {
      return _.without(this.possibleColumns(), ...this.usedColumns());
    },
    table() {
      const html = XLSX.utils.sheet_to_html(this.worksheet(), { editable: true });
      return html;
    },
    worksheet() {
      return this.workbook().Sheets[this.sheetName()];
    },
    getEditedSheet() {
      const instance = this.templateInstance;
      instance.$('tr:first-child select').remove(); // Need to strip the select boxes from the header row
      const editedTable = instance.$('.import-table')[0];
      const editedSheet = XLSX.utils.table_to_sheet(editedTable, { range: this.headerRow /* ,cellDates: true */ });
      return editedSheet;
    },
    getImportableSheet() {
      const worksheet = this.worksheet();
      const editedSheet = this.getEditedSheet();
      _.each(worksheet, (cell, key) => {
        if (key.length === 2 && key[1] === '1') { // so if header cell (A1, B1, ..., Z1)
          worksheet[key] = editedSheet[key];
        }
      });
      return worksheet;
    },
    savePhase() {
      const conductor = this.conductor();
      Settings.set(`import.${conductor.name}.${conductor.phaseIndex}.columnMapping`, this.columnMapping());
//      Settings.set(`import.${conductor.name}.${conductor.phaseIndex}.headerRow`, this.headerRow());
      Settings.set(`import.${conductor.name}.${conductor.phaseIndex}.sheetName`, this.sheetName());
    },
  },
});

//--------------------------------------------

Template.Import_upload.viewmodel({
  share: 'import',
  format: '',
  viewColumns: false,
  selectedColumns: [],
  onCreated() {
    this.format(this.templateInstance.data.options.format || 'default');
  },
  collection() {
    return this.templateInstance.data.collection;
  },
  availableFormats() {
    const formats = Object.keys(Conductors[this.collection()._name]);
    return formats.map(k => ({ value: k, label: __(k) }));
  },
  potentialConductor() {
    const options = _.extend(this.templateInstance.data.options, { format: this.format() });
    const conductor = getConductor(this.collection(), options);
    return conductor;
  },
});

Template.Import_upload.events({
  'click #view-columns'(event, instance) {
    instance.viewmodel.viewColumns(true);
  },
  'focusout select'(event, instance) {
    instance.viewmodel.viewColumns(false);
  },
  'click button[name=download]'(event, instance) {
    const selectedColumns = instance.viewmodel.selectedColumns();
    const possibleColumns = instance.viewmodel.possibleColumns();
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
  'click button[name=upload]'(event, instance) {
    UploadFS.selectFile(function (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        let data = e.target.result;
        if (!rABS) data = new Uint8Array(data);
        const workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' /*, cellDates: true*/ });
        instance.viewmodel.workbook(workbook);
        instance.viewmodel.conductor(instance.viewmodel.potentialConductor());
        instance.viewmodel.usedColumns([]);
        Modal.hide();
        launchNextPhase(instance.viewmodel);
      };
      if (rABS) reader.readAsBinaryString(file);
      else reader.readAsArrayBuffer(file);
    });
  },
});

//--------------------------------------------

Template.Import_preview.viewmodel({
  share: 'import',
  checked: false,
  autorun() {
    this.savingEnabled(this.checked());
  },
  onCreated(instance) {
    const conductor = this.conductor();
    debugAssert(conductor.phaseIndex >= 0);
    this.columnMapping(Settings.get(`import.${conductor.name}.${conductor.phaseIndex}.columnMapping`) || {});
//    this.headerRow(Settings.get(`import.${conductor.name}.${conductor.phaseIndex}.headerRow`) || 1);
    this.sheetName(Settings.get(`import.${conductor.name}.${conductor.phaseIndex}.sheetName`) || this.workbook().SheetNames[0]);
  },
  onRendered(instance) {
    const vm = this;
    instance.autorun(() => {
      if (vm.table()) { // need to trigger it when table changes
        Meteor.setTimeout(() => instance.viewmodel.onTableRendered(instance), 1000);
      }
    });
  },
  onTableRendered(instance) {
    const tableElem = instance.$('table');
    tableElem.addClass('table dataTable display import-table');
//    for (let i = 0; i < this.headerRow(); i++) {
//      instance.$('tr:first-child').remove();
//    }
    const headerRow = instance.$('tr:first-child');
    headerRow.children().each((i, td) => {
      const tdElem = $(td);
      const _columnName = td.innerText;
      const L = ALPHABET.charAt(i);
      const _originalColumnName = this.worksheet()[L + '1']?.w;
      tdElem.empty();
      Blaze.renderWithData(Template.Import_header_cell,
        { _originalColumnName, _columnName }, td,
      );
    });
    Meteor.setTimeout(function () { doubleScroll(tableElem); }, 1000);
  },
});

Template.Import_preview.events({
  'click .js-skip'(event, instance) {
    Modal.hide(instance.parent(3)); // 2 parents are template_dynamic, and the 3rd is the containing modal
    launchNextPhase(instance.viewmodel);
  },
});

//--------------------------------------------

Template.Import_header_cell.viewmodel({
  share: 'import',
  columnName: '',
  onCreated(instance) {
    const visibleComunName = (instance.data._originalColumnName
      && this.columnMapping()[instance.data._originalColumnName])
      || instance.data._columnName;
    this.changeColumnName(visibleComunName);
  },
  onRendered(instance) {
    const viewmodel = this;
    instance.find('span').addEventListener('input', function() { viewmodel.textChanged(); }, false);
  },
  changeColumnName(newName) {
    this.usedColumns(_.without(this.usedColumns(), this.columnName()));
    this.columnName(newName);
    this.usedColumns().push(this.columnName());
  },
  textChanged(e) {
    this.changeColumnName(this.templateInstance.$('span')[0].innerText);
  },
  isValidColumn() {
    return _.contains(this.possibleColumns(), this.columnName());
  },
});

Template.Import_header_cell.events({
  'change select'(event, instance) {
    const selected = event.target.selectedOptions[0].value;
    instance.viewmodel.changeColumnName(selected);
    instance.viewmodel.columnMapping()[instance.data._originalColumnName] = selected;
//    Blaze.remove(instance.view);  should remove somewhere
  },
});
