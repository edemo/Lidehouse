/* globals $ */
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { communityColumns } from '/imports/api/communities/tables.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import './communities-listing.html';

Template.Communities_listing.onCreated(function onCreated() {
  this.subscribe('communities.listing');
  this.subscribe('templates.listing');
});

Template.Communities_listing.helpers({
  communities() {
    return Communities.find({});
  },
  reactiveTableDataFn() {
    function getTableData() {
      return Communities.find({ isTemplate: { $ne: true } }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: communityColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Communities_listing.events(
  actionHandlers(Communities)
);
