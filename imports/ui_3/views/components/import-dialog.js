import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
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

Template.Import_preview.onRendered(function () {
  this.$('table').addClass('table dataTable display import-table');
});

//--------------------------------------------

Template.Import_dialog.viewmodel({
  table: '',
  enableButtons(val) {
    this.templateInstance.data.buttonsAreDisabled.set(!val);
  },
});
