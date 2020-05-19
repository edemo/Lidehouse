import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ViewModel } from 'meteor/manuel:viewmodel';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { debugAssert } from '/imports/utils/assert.js';
import { doubleScroll } from '/imports/ui_3/lib/double-scroll.js';
import { Settings } from '/imports/api/settings/settings.js';
import '/imports/ui_3/views/blocks/help-icon.js';
import './import-dialog.html';

ViewModel.share({
  import: {
    phaseIndex: -1,
    table: '',
    worksheet: null,
    columnMapping: {},
    saveColumnMapppings: false,
    availableColumns: [],
    phase() {
      return this.phaseIndex() >= 0 ? this.templateInstance.data.conductor.phase(this.phaseIndex()) : undefined;
    },
  },
});

//--------------------------------------------

Template.Import_upload.viewmodel({
  share: 'import',
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
  share: 'import',
  checked: false,
  autorun() {
    this.saveColumnMapppings(this.checked());
  },
  onCreated(instance) {
    debugAssert(this.phaseIndex() >= 0);
    const data = this.templateInstance.data;
    this.columnMapping(Settings.get(`import.${data.conductor.name()}.${this.phaseIndex()}.columnMapping`) || {});
  },
  onRendered(instance) {
    const columns = instance.data.columns.filter(c => c.key); // leave out the sperators, like "PARCELS DATA"
    const validColumnNames = _.without(_.pluck(columns, 'name'), undefined);
    this.availableColumns([].concat(validColumnNames));
    const tableElem = instance.$('table');
    tableElem.addClass('table dataTable display import-table');
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
