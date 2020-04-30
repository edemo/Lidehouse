import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
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
  const columns = this.data.columns.filter(c => c.key);
  const knownColumnNames = _.without(_.pluck(columns, 'name'), undefined);
  this.viewmodel.availableColumns([].concat(knownColumnNames));
  const tableElem = this.$('table');
  tableElem.addClass('table dataTable display import-table');
  const headerRow = this.$('tr:first-child');
  headerRow.children().each((i, td) => {
    const tdElem = $(td);
    if (_.contains(this.viewmodel.availableColumns(), td.innerText)) {
      tdElem.addClass('bg-primary');
      this.viewmodel.availableColumns(_.without(this.viewmodel.availableColumns(), td.innerText));
    } else {
      tdElem.addClass('bg-danger');
      tdElem.append('<br>');
      Blaze.renderWithData(Template.Select_from_columns, { columns: this.viewmodel.availableColumns }, td);
    }
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

Template.Select_from_columns.viewmodel({
  availableColums() {
    const columns = this.templateInstance.data.columns; // it is a viewmodel reactiveVar
    return columns();
  },
});

Template.Select_from_columns.events({
  'change select'(event, instance) {
    const selected = event.target.selectedOptions[0].value;
    const tdElem = $(event.target).closest('td');
    tdElem[0].innerText = selected;
    tdElem.removeClass('bg-danger').addClass('bg-primary');
    instance.data.columns(_.without(instance.data.columns(), selected));
    Blaze.remove(instance.view);
  },
});

