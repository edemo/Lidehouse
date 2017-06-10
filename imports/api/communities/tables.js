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
    { data: 'city', title: __('communities.city.label') },
    { data: 'zip', title: __('communities.zip.label') },
    { data: 'street', title: __('communities.street.label') },
    { data: 'number', title: __('communities.number.label') },
    { data: 'lot', title: __('communities.lot.label') },
  ];
}
