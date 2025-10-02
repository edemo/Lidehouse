import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
//import Tabular from 'meteor/aldeed:tabular';
//import { TAPi18n } from 'meteor/tap:i18n';
//import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

//import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export function parcelColumns(community) {
  return [
    { data: 'createdAt.getTime()', title: '', render: Render.noDisplay },
    { data: 'serial', title: __('schemaParcels.serial.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'view,edit,delete,occupants,meters,contracts', size: 'sm' }, cell),
    },
    { data: 'ref', title: __('schemaParcels.ref.label') },
    community?.hasLeadParcels() &&
      { data: 'leadParcelRef()', title: __('schemaParcels.leadRef.label') },
    community?.hasPhysicalLocations() && 
      { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label') },
    Meteor.user().hasPermission('parcels.insert') &&
      { data: 'group', title: __('schemaParcels.group.label') },
    community?.hasPhysicalLocations() && 
      { data: 'lot', title: __('schemaParcels.lot.label') },
    community?.hasPhysicalLocations() && 
      { data: 'area', title: __('schemaParcels.area.label'), render: Render.formatNumber(2) },
    community?.hasVotingUnits() && 
      { data: 'units', title: __('schemaParcels.units.label'), render: Render.formatNumber(2) },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
  ].filter(c => c);
}

export function localizerColumns() {
  return [
    { data: 'code', title: __('schemaAccounts.code.label') },
    { data: 'displayName()', title: __('schemaParcels.ref.label') },
    { data: 'entityName()', title: __('schemaParcels.category.label'), render: Render.translateWithScope('schemaParcels.category') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'view,edit,delete', size: 'sm' }, cell),
    },
  ];
}

export function parcelFinancesColumns() {
  return [
    { data: 'ref', title: __('schemaParcels.leadRef.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'finances,meters', size: 'sm' }, cell),
    },
    { data: 'type', title: __('schemaParcels.type.label') },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
    { data: 'withFollowers()', title: __('follower parcels') },
    { data: 'payerContract().outstanding()', title: __('schemaBills.outstanding.label') },
    { data: 'payerContract().lastBill().serialId', title: __('last bill') },
    { data: 'payerContract().lastBill().amount', title: __('last amount') },
  ];
}

export function highlightMyRow(row, data, index) {
  const parcelId = data._id;
  const leadParcelId = Parcels.findOne(parcelId).leadParcelId();
  const isMine = Memberships.findOne({ parcelId, userId: Meteor.userId() }) ||
    Memberships.findOne({ parcelId: leadParcelId, userId: Meteor.userId() });
  if (isMine) {
    $(row).addClass('tr-bold');
  }
}

/* with aldeed:tabular:
const parcelColumns = [
  { data: 'ref', title: __('schemaParcels.ref.label') },
  { data: 'leadParcelRef()', title: __('schemaParcels.leadParcelId.label') },
  { data: 'location()', title: __('schemaParcels.location.label') },
  { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
  { data: 'area', title: 'm2' },
//  { data: 'share()', title: __('schemaParcels.units.label') },
  { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
  { tmpl: Meteor.isClient && Template.Action_buttons_group,
    tmplContext: rowData => ({
      doc: rowData,
      collection: 'parcels',
      actions: 'view,edit,occupants,meters,delete',
      size: 'sm',
    }),
  },
];

const parcelsTable = new Tabular.Table({
  name: 'Parcels',
  collection: Parcels,
  columns: parcelColumns,
  extraFields: ['communityId'],
  selector(userId) { return {}; }, //communityId: Template.instance.viewmodel.communityId() }; },

//  responsive: true,
//  autoWidth: false,

  createdRow: highlightMyRow,
  tableClasses: 'display',
  language: Meteor.isClient && datatables_i18n[TAPi18n.getLanguage()],
  lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
  pageLength: 25,
  ...DatatablesExportButtons,
});
*/
