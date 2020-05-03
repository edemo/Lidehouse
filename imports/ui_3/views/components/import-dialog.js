import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import '/imports/ui_3/views/blocks/help-icon.js';
import './import-dialog.html';

Template.Import_upload.viewmodel({
  viewColumns: false,
  selected: [],
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
  availableColumns: [],
  checked: false,
  autorun() {
    this.templateInstance.data.vm.saveColumnMapppings.set(this.checked());
  },
});

Template.Import_preview.onRendered(function () {
  const columns = this.data.columns.filter(c => c.key); // leave out the sperators, like "PARCELS DATA"
  const validColumnNames = _.without(_.pluck(columns, 'name'), undefined);
  this.viewmodel.availableColumns([].concat(validColumnNames));
  const tableElem = this.$('table');
  tableElem.addClass('table dataTable display import-table');
  const headerRow = this.$('tr:first-child');
  headerRow.children().each((i, td) => {
    const tdElem = $(td);
    const _columnName = td.innerText;
    tdElem.empty();
    const vm = _.extend({}, this.data.vm, { availableColumns: this.viewmodel.availableColumns });
    Blaze.renderWithData(Template.Import_header_cell,
      { _columnName, columns: validColumnNames, vm }, td
    );
  });
});

//--------------------------------------------

Template.Import_dialog.viewmodel({
  table: '',
  enableButtons(val) {
    this.templateInstance.data.vm.buttonsAreDisabled.set(!val);
  },
});

//--------------------------------------------

Template.Import_header_cell.viewmodel({
  columnName: '',
  onCreated(instance) {
    const mappedName = instance.data.vm.columnMapping.get()[instance.data._columnName];
    this.columnName(mappedName || instance.data._columnName);
  },
  onRendered(instance) {
    const viewmodel = this;
    instance.find('span').addEventListener('input', function() { viewmodel.textChanged(); }, false);
  },
  autorun() {
    const data = this.templateInstance.data;
    if (_.contains(data.vm.availableColumns(), this.columnName())) {
      data.vm.availableColumns(_.without(data.vm.availableColumns(), this.columnName()));
    }
  },
  textChanged() {
    this.columnName(this.templateInstance.$('span')[0].innerText);
  },
  isValidColumn() {
    return _.contains(this.getValidColums(), this.columnName());
  },
  getAvailableColums() {
    return this.templateInstance.data.vm.availableColumns(); // it is a viewmodel var, in the parent (so they share it)
  },
  getValidColums() {
    return this.templateInstance.data.columns;
  },
});

Template.Import_header_cell.events({
  'change select'(event, instance) {
    const selected = event.target.selectedOptions[0].value;
    instance.viewmodel.columnName(selected);
    instance.data.vm.columnMapping.get()[instance.data._columnName] = selected;
//    Blaze.remove(instance.view);  should remove somewhere
  },
});

