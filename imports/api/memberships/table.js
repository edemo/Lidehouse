/* eslint-disable no-new */
import Tabular from 'meteor/aldeed:tabular';
import { TAPi18n } from 'meteor/tap:i18n';
import { Memberships } from './memberships.js';

const __ = TAPi18n.__;

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

export function tableColumns() {
  return [
    { data: 'ownership.serial', title: __('memberships.ownership.serial.label') },
    { data: 'location()', title: __('memberships.ownership.location.label') },
    { data: 'ownership.type', title: __('memberships.ownership.type.label') },
    { data: 'ownership.lot', title: __('memberships.ownership.lot.label') },
    { data: 'ownership.size', title: __('memberships.ownership.size.label') },
    { data: 'votingShares()', title: __('memberships.ownership.share.label') },
    { data: 'ownerName()', title: __('owner') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}

// for aldeed:tabular datatable
new Tabular.Table({
  name: 'Memberships',
  collection: Memberships,
  columns: tableColumns(),
  extraFields: ['userId', 'communityId'],
  responsive: true,
  autoWidth: false,
});
