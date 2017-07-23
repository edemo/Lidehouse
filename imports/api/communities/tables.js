import { TAPi18n } from 'meteor/tap:i18n';

const __ = TAPi18n.__;

function renderJoinButton(cellData, renderType, currentRow) {
  const html = `<a href="#" data-id=${cellData} class="js-join">${__('join')}</a>`;
  return html;
}

export function communityColumns() {
  return [
    { data: 'name', title: __('name') },
    { data: '_id', render: renderJoinButton },
    { data: 'city', title: __('schemaCommunities.city.label') },
    { data: 'zip', title: __('schemaCommunities.zip.label') },
    { data: 'street', title: __('schemaCommunities.street.label') },
    { data: 'number', title: __('schemaCommunities.number.label') },
    { data: 'lot', title: __('schemaCommunities.lot.label') },
  ];
}
