import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import './import-dialog.html';

Template.Import_preview.onRendered(function () {
  this.$('table').addClass('table dataTable display import-table');
});

Template.Import_dialog.viewmodel({
  table: '',
  enableButtons(val) {
    this.templateInstance.data.buttonsAreDisabled.set(!val);
  },
});
