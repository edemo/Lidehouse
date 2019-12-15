import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { $ } from 'meteor/jquery';

export const Render = {
  translate(cellData, renderType, currentRow) {
    return __(cellData);
  },
  translateWithScope(scope) {
    return function translate(cellData, renderType, currentRow) {
      if (!cellData) return '---';
      return __(`${scope}.${cellData}`);
    };
  },
  formatNumber: $.fn.dataTable.render.number(' ', ',', 0),  // numeral no good here, it renders a string, so sorting not working correctly on this column afterwards
  // https://datatables.net/manual/data/renderers#Number-helper
  formatDate(cellData, renderType, currentRow) {
    if (!cellData) return '---';
    return moment(cellData).format('L');
  },
  formatTime(cellData, renderType, currentRow) {
    if (!cellData) return '---';
    return moment(cellData).format('L LT');
  },
  checkmarkBoolean(cellData, renderType, currentRow) {
    const icon = cellData ? 'fa-check' : 'fa-times';
    const color = cellData ? 'primary' : 'danger';
    return `<i class="fa ${icon} text-${color}"></i>`;
  },
  displayTitle(topicId) {
    const title = Topics.findOne(topicId).title;
    const html = `<span class='issue-info'><a data-id=${topicId} class="js-view">${title}</a></span>`;
    return html;
  },
  joinOccupants(occupants) {
    let result = '';
    occupants.forEach((m) => {
      const repBadge = m.isRepresentor() ? `<i class="fa fa-star" title=${__('representor')}></i>` : '';
      const occupancyDetail = m.ownership ? '(' + m.ownership.share.toStringLong() + ')' : '';
      result += `${m.Person().displayName()} ${occupancyDetail} ${repBadge}<br>`;
    });
    return result;
  },
};
