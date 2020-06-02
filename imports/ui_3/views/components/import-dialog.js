import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ViewModel } from 'meteor/manuel:viewmodel';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import XLSX from 'xlsx';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { doubleScroll } from '/imports/ui_3/lib/double-scroll.js';
import { Settings } from '/imports/api/settings/settings.js';
import { Conductors, getConductor } from '/imports/data-import/conductors.js';
import '/imports/ui_3/views/blocks/help-icon.js';
import './import-dialog.html';

ViewModel.share({
  import: {
    workbook: null,
    sheetName: '',
    columnMapping: {},
    savingEnabled: false,
    availableColumns: [],
    conductor: null,
//    headerRow: 0,
//    headerRowOptions() {
//      return [
//        { value: -1, label: '---' },
//        { value: 0, label: '1.' },
//        { value: 1, label: '2.' },
//      ];
//    },
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
    const possibleColumns = this.conductor().possibleColumns();
    const validColumnNames = _.without(_.pluck(possibleColumns, 'name'), undefined);
    this.availableColumns([].concat(validColumnNames));
    const tableElem = instance.$('table');
    tableElem.addClass('table dataTable display import-table');
//    for (let i = 0; i < this.headerRow(); i++) {
//      instance.$('tr:first-child').remove();
//    }
    const headerRow = instance.$('tr:first-child');
    headerRow.children().each((i, td) => {
      const tdElem = $(td);
      const _columnName = td.innerText;
      tdElem.empty();
      Blaze.renderWithData(Template.Import_header_cell,
        { _columnName, columns: validColumnNames }, td,
      );
    });
    Meteor.setTimeout(function () { doubleScroll(tableElem); }, 1000);
  },
});

//--------------------------------------------

Template.Import_header_cell.viewmodel({
  share: 'import',
  columnName: '',
  onCreated(instance) {
    const mappedName = this.columnMapping()[instance.data._columnName];
    this.columnName(mappedName || instance.data._columnName);
  },
  onRendered(instance) {
    const viewmodel = this;
    instance.find('span').addEventListener('input', function() { viewmodel.textChanged(); }, false);
  },
  autorun() {
    if (_.contains(this.availableColumns(), this.columnName())) {
      this.availableColumns(_.without(this.availableColumns(), this.columnName()));
    }
  },
  textChanged() {
    this.columnName(this.templateInstance.$('span')[0].innerText);
  },
  isValidColumn() {
    return _.contains(this.templateInstance.data.columns, this.columnName());
  },
});

Template.Import_header_cell.events({
  'change select'(event, instance) {
    const selected = event.target.selectedOptions[0].value;
    instance.viewmodel.columnName(selected);
    instance.viewmodel.columnMapping()[instance.data._columnName] = selected;
//    Blaze.remove(instance.view);  should remove somewhere
  },
});
