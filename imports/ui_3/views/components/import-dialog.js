import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

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
    Blaze.renderWithData(Template.Import_header_cell,
      { _columnName, columns: validColumnNames, availableColumns: this.viewmodel.availableColumns }, td
    );
  });
});

//--------------------------------------------

Template.Import_dialog.viewmodel({
  table: '',
  enableButtons(val) {
    this.templateInstance.data.buttonsAreDisabled.set(!val);
  },
});

//--------------------------------------------

Template.Import_header_cell.viewmodel({
  columnName: '',
  onCreated(instance) {
    this.columnName(instance.data._columnName);
  },
  onRendered(instance) {
    const vm = this;
    instance.find('span').addEventListener('input', function() { vm.textChanged(); }, false);
  },
  autorun() {
    const data = this.templateInstance.data;
    if (_.contains(data.availableColumns(), this.columnName())) {
      data.availableColumns(_.without(data.availableColumns(), this.columnName()));
    }
  },
  textChanged() {
    this.columnName(this.templateInstance.$('span')[0].innerText);
  },
  isValidColumn() {
    return _.contains(this.getValidColums(), this.columnName());
  },
  getAvailableColums() {
    return this.templateInstance.data.availableColumns(); // it is a viewmodel var, in the parent (so they share it)
  },
  getValidColums() {
    return this.templateInstance.data.columns;
  },
});

Template.Import_header_cell.events({
  'change select'(event, instance) {
    const selected = event.target.selectedOptions[0].value;
    instance.viewmodel.columnName(selected);
//    Blaze.remove(instance.view);  should remove somewhere
  },
});

