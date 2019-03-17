import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Session } from 'meteor/session';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

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
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber },
    { data: 'credit', title: __('schemaTransactions.credit.label'), render: Render.journalEntries },
    { data: 'debit', title: __('schemaTransactions.debit.label'), render: Render.journalEntries },
//    { data: 'placeAccounts()', title: __('Konyveles hely'), render: Render.breakdowns },
    { data: 'ref', title: __('schemaTransactions.ref.label') },
    { data: 'note', title: __('schemaTransactions.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];

  return columns;
}
*/

Template.Parcels_finances.viewmodel({
  showAllParcels: false,
  parcelToView: '',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('breakdowns.inCommunity', { communityId });
      if (Meteor.userOrNull().hasPermission('balances.ofLocalizers')) {
        if (self.showAllParcels()) {
          instance.subscribe('balances.ofLocalizers', { communityId });
        } else {
          instance.subscribe('balances.ofLocalizers', { communityId, limit: 10 });
        }
      } else {
        instance.subscribe('balances.ofSelf', { communityId });
      } 
    });
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
    return Parcels.find().map((parcel) => {
      return { label: parcel.display(), value: Localizer.parcelRef2code(parcel.ref) };
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
        const balance = (-1) * Balances.getTotal({ communityId, account: '33', localizer: Localizer.parcelRef2code(parcelRef), tag: 'T' });
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
    const parcelRef = $(event.target).closest('button').data('id');
    const localizerCode = Localizer.parcelRef2code(parcelRef);
    instance.viewmodel.parcelToView(localizerCode);
  },
  'click #balances .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});
