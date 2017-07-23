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

export function roleshipColumns() {
  return [
    { data: 'userName()', title: __('user') },
    { data: 'role', title: __('role'), render: translate },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}

export function ownershipColumns() {
  return [
    { data: 'userName()', title: __('owner') },
    { data: 'ownership.share', title: __('schemaMemberships.ownership.share') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}
