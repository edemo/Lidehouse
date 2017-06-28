import { TAPi18n } from 'meteor/tap:i18n';

const __ = TAPi18n.__;

function translate(cellData, renderType, currentRow) {
  return __(cellData);
}

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

export function parcelColumns() {
  return [
    { data: 'serial', title: __('parcels.serial.label') },
    { data: 'location()', title: __('parcels.location.label') },
    { data: 'type', title: __('parcels.type.label'), render: translate },
    { data: 'lot', title: __('parcels.lot.label') },
    { data: 'size', title: __('parcels.size.label') },
    { data: 'share()', title: __('parcels.units.label') },
    { data: 'ownerName()', title: __('owner') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}
