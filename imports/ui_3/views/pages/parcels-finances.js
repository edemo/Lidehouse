import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { JournalEntries } from '/imports/api/journals/entries.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { remove as removeJournal, billParcels } from '/imports/api/journals/methods.js';
import { Session } from 'meteor/session';
import { journalColumns } from '/imports/api/journals/tables.js';
import { breakdownColumns } from '/imports/api/journals/breakdowns/tables.js';
import { Reports } from '/imports/api/journals/reports/reports.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Balances } from '/imports/api/journals/balances/balances.js';

import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/custom-table.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '../common/ibox-tools.js';
import '../components/balance-widget.js';
import '../components/balance-report.js';
import './parcels-finances.html';

/*  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const myParcelIds = Memberships.find({ communityId, personId: Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());
    // const allParcelIds = Communities.find(communityId).parcels().map(p => p.serial.toString());
    // $('select#localizer').val(myParcelIds[0] || 'Localizer');
    this.getActiveLocalizer = function () {
      return $('select#localizer').val();
    };
    this.getActiveParcelFilter = function () {
      const activeLocalizer = this.getActiveLocalizer();
      const localizerPac = Breakdowns.findOne({ communityId, name: 'Localizer' });
      const filter = { $in: localizerPac.leafsOf(activeLocalizer) };
      return filter;
    };
  }); */

/*
export function Columns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  const columns = [
    { data: 'valueDate', title: __('schemaJournals.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaJournals.amount.label'), render: Render.formatNumber },
    { data: 'credit', title: __('schemaJournals.credit.label'), render: Render.journalEntries },
    { data: 'debit', title: __('schemaJournals.debit.label'), render: Render.journalEntries },
//    { data: 'placeAccounts()', title: __('Konyveles hely'), render: Render.breakdowns },
    { data: 'ref', title: __('schemaJournals.ref.label') },
    { data: 'note', title: __('schemaJournals.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];

  return columns;
}
*/

Template.Parcels_finances.viewmodel({
  showAllParcels: false,
  parcelToView: '',
  autorun() {
    const communityId = Session.get('activeCommunityId');
    this.templateInstance.subscribe('breakdowns.inCommunity', { communityId });
    if (Meteor.userOrNull().hasPermission('balances.ofLocalizers')) {
      if (this.showAllParcels()) {
        this.templateInstance.subscribe('balances.ofLocalizers', { communityId });
      } else {
        this.templateInstance.subscribe('balances.ofLocalizers', { communityId, limit: 10 });
      }
    } else {
      this.templateInstance.subscribe('balances.ofSelf', { communityId });
    } 
  },
  myLeadParcels() {
    const communityId = this.communityId();
    const user = Meteor.user();
    if (!user || !communityId) return [];
    return user.ownedLeadParcels().map(p => p.ref);
  },
  myLeadParcelOptions() {
    const communityId = Session.get('activeCommunityId');
    const myOwnerships = Memberships.find({ communityId, active: true, approved: true, personId: Meteor.userId(), role: 'owner' });
    const myLeadParcelRefs = _.uniq(myOwnerships.map(m => { 
      const parcel = m.parcel();
      return (parcel && !parcel.isLed()) ? parcel.ref : null;
    }));
    return myLeadParcelRefs.map((ref) => { return { label: ref, value: ref }; });
  },
  parcelChoices() {
    const localizer = Breakdowns.localizer();
    if (!localizer) return [];
    return Parcels.find().fetch().map((p) => {
      const node = localizer.findNodeByName(p.ref);
      return { label: p.display(), value: node.code };
    });
  },
  parcelFinancesTableDataFn() {
    const communityId = Session.get('activeCommunityId');
    return () => {
      const dataset = [];
      const parcels = Parcels.find({ communityId, approved: true });
      parcels.forEach(parcel => {
        const parcelRef = parcel.ref;
        const owners = parcel.owners().fetch();
        const balance = Balances.get({ communityId, account: '33', localizer: parcelRef, tag: 'T' });
        dataset.push({ parcelRef, owners, balance });
      });
      return dataset;
    };
  },
  parcelFinancesOptionsFn() {
    return () => {
      return {
        columns: [
          { data: 'parcelRef', title: __('schemaParcels.ref.label') },
          { data: 'owners', title: __('owner'), render: Render.joinOccupants },
          { data: 'balance', title: __('Balance'), render: Render.formatNumber },
          { data: 'parcelRef', title: __('Action buttons'), render: Render.buttonViewLink },
        ],
      };
    };
  },
/*  parcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      let parcels = Tracker.nonreactive(() => Parcels.find({ communityId, approved: true }).fetch());
      if (!self.showAllParcels()) {
        const myParcelIds = Memberships.find({ communityId, personId: Meteor.userId() }).map(m => m.parcelId);
        parcels = parcels.filter(p => _.contains(myParcelIds, p._id));
      }
      return parcels;
    };
  },
  parcelsOptionsFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      const permissions = {
        view: Meteor.userOrNull().hasPermission('parcels.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('parcels.update', communityId),
        delete: Meteor.userOrNull().hasPermission('parcels.remove', communityId),
        assign: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
      };
      return {
        columns: parcelColumns(permissions),
        createdRow: highlightMyRow,
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
        pageLength: 25,
        // coming from the theme:
        dom: '<"html5buttons"B>lTfgitp',
        buttons: [
            { extend: 'copy' },
            { extend: 'csv' },
            { extend: 'excel', title: 'ExampleFile' },
            { extend: 'pdf', title: 'ExampleFile' },
            { extend: 'print',
                customize: function (win) {
                    $(win.document.body).addClass('white-bg');
                    $(win.document.body).css('font-size', '10px');

                    $(win.document.body).find('table')
                        .addClass('compact')
                        .css('font-size', 'inherit');
                },
            },
        ],
      };
    };
  },*/
});

Template.Parcels_finances.events({
  'click #balances .js-view'(event, instance) {
//    event.preventDefault(); // the <a> functionality destroys the instance.data!!!
    const parcelCode = $(event.target).closest('button').data('id');
    instance.viewmodel.parcelToView(parcelCode);
  },
  'click #balances .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});
