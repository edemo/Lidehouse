import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';

import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

import Tabular from 'meteor/aldeed:tabular';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

if (Meteor.isClient) {
  import '/imports/ui_3/views/blocks/action-buttons.js';
  import { $ } from 'meteor/jquery';
  import dataTablesBootstrap from 'datatables.net-bs';
  import 'datatables.net-bs/css/dataTables.bootstrap.css';
  // datatables extensions
  import dataTableButtons from 'datatables.net-buttons-bs';
  import columnVisibilityButton from 'datatables.net-buttons/js/buttons.colVis.js';
  import html5ExportButtons from 'datatables.net-buttons/js/buttons.html5.js';
  import flashExportButtons from 'datatables.net-buttons/js/buttons.flash.js';
  import printButton from 'datatables.net-buttons/js/buttons.print.js';

  dataTablesBootstrap(window, $);
  // datatables extensions
  dataTableButtons(window, $);
  columnVisibilityButton(window, $);
  html5ExportButtons(window, $);
  flashExportButtons(window, $);
  printButton(window, $);
}

function handlingRemove(view, cell) {
  $(cell).on('remove', function () {
    Blaze.remove(view);
  });
  return view;
}

export function parcelColumns() {
  return [
    { data: 'ref', title: __('schemaParcels.ref.label') },
    { data: 'leadRef', title: __('schemaParcels.leadRef.label') },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translateWithScope('schemaParcels.type') },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'area', title: __('schemaParcels.area.label') },
    { data: 'units', title: __('schemaParcels.units.label') },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => handlingRemove(Blaze.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'view,edit,occupants,meters,delete', size: 'sm' }, cell), cell),
    },
  ];
}

export function localizerColumns() {
  return [
    { data: 'code', title: __('schemaAccounts.code.label') },
    { data: 'displayName()', title: __('schemaParcels.location.label') },
    { data: 'category', title: __('schemaParcels.category.label'), render: Render.translateWithScope('schemaParcels.category') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'view,edit,delete', size: 'sm' }, cell),
    },
  ];
}

export function parcelFinancesColumns() {
  return [
    { data: 'ref', title: __('schemaParcels.ref.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translateWithScope('schemaParcels.type') },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
    { data: 'withFollowers()', title: __('follower parcels') },
    { data: 'payerMembership().outstanding', title: __('schemaBills.outstanding.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'parcels', actions: 'finances,meters', size: 'sm' }, cell),
    },
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

const parcelColumns = [
  { data: 'ref', titleFn: () => __('schemaParcels.ref.label') },
  { data: 'leadRef', titleFn: () => __('schemaParcels.leadRef.label') },
  { data: 'location()', titleFn: () => __('schemaParcels.location.label') },
  { data: 'type', titleFn: () => __('schemaParcels.type.label'), render: Meteor.isClient && Render.translateWithScope('schemaParcels.type') },
  { data: 'lot', titleFn: () => __('schemaParcels.lot.label') },
  { data: 'area', titleFn: () => 'm2' },
  { data: 'share()', titleFn: () => __('schemaParcels.units.label') },
  { data: 'occupants()', titleFn: () => __('occupants'), render: Meteor.isClient && Render.joinOccupants },
  { tmpl: Meteor.isClient && Template.Action_buttons_group, titleFn: () => __('Action buttons'),
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
  extraFields: ['category', 'communityId', 'building', 'floor', 'door', 'units'],
  selector(userId) {
    const user = Meteor.users.findOne(userId);
    const partners = Partners.find({ userId });
    const communitityIds = partners.map(p => p.communityId).filter(communityId => user.hasPermission('parcels.inCommunity', { communityId }));
    return { communityId: { $in: communitityIds } };
  },

//  responsive: true,
//  autoWidth: false,

  createdRow: highlightMyRow,
  tableClasses: 'display',
  language: Meteor.isClient && datatables_i18n[TAPi18n.getLanguage()],
  lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
  pageLength: 25,
  ...DatatablesExportButtons,
});

// TODO: This does not seem to work to translate it
if (Meteor.isClient) {
  Meteor.startup(function() {
    Tracker.autorun(function() {
      $.extend(true, $.fn.dataTable.defaults, {
        language: datatables_i18n[TAPi18n.getLanguage()],
      });
    });
  });
}
