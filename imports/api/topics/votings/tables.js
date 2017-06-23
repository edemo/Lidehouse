import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';

const __ = TAPi18n.__;

function formatTime(cellData, renderType, currentRow) {
  return moment(cellData).format('YYYY.MM.DD hh:mm');
}

function translate(cellData, renderType, currentRow) {
  return __(cellData);
}

function renderViewButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-view nav-item glyphicon glyphicon-eye-open"></span>`;
  return html;
}

export function voteColumns() {
  return [
    { data: 'title', title: __('topics.title.label') },
    { data: 'createdBy()', title: __('createdBy') },
    { data: 'createdAt', title: __('createdAt'), render: formatTime },
    { data: '_id', render: renderViewButton },
  ];
}
