import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { $ } from 'meteor/jquery';

import { debugAssert } from '/imports/utils/assert.js';
import { checkmarkBoolean } from '/imports/ui_3/helpers/api-display.js';
import { absoluteUrl } from '/imports/ui_3/helpers/utils.js';
import { Topics } from '/imports/api/topics/topics.js';

export const Render = Meteor.isServer ? {} : {
  noDisplay(cellData, renderType, currentRow) {
    if (renderType === 'display') return '';
    return cellData;  // sorting on the data will work
  },
  translate(cellData, renderType, currentRow) {
    return __(cellData);
  },
  translateWithScope(scope) {
    return function translate(cellData, renderType, currentRow) {
      if (!cellData) return '---';
      return cellData.toString().split(',').map(text => __(`${scope}.options.${text}`)).join(',');
    };
  },
  formatNumber(decimals) {
    const numeralData = numeral.languageData();
    return $.fn.dataTable.render.number(numeralData.delimiters.thousands, numeralData.delimiters.decimal, decimals);
    // numeral.format() not good here, as it renders a string into the cell, so sorting/filtering will not work correctly on this column
    // https://datatables.net/manual/data/renderers#Number-helper
  },
  formatDate(cellData, renderType, currentRow) {
    if (!cellData) return '---';
    return moment.utc(cellData).format('YYYY.MM.DD');
  },
  formatTime(cellData, renderType, currentRow) {
    if (!cellData) return '---';
    return moment(cellData).format('YYYY.MM.DD HH:mm');
  },
  checkmarkBoolean(cellData, renderType, currentRow) {
    if (renderType === 'display') return checkmarkBoolean(cellData);
    switch (cellData) {
      case false: return 0;
      case true: return 1;
      case undefined: return 2;
      default: debugAssert(false); return undefined;
    }
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
      const partner = m.partner();
      result += `${partner ? partner.displayName() : 'NO PARTNER'} ${occupancyDetail} ${repBadge}<br>`;
    });
    return result;
  },
  userAvatar(cellData, renderType, currentRow) {
    if (!cellData) return '';
    return `<img alt="avatar" src=${absoluteUrl(cellData.avatar)} width="24">`;
  },
  userBio(cellData, renderType, currentRow) {
    if (!cellData || !cellData.profile) return '';
    const bio = cellData.profile.bio;
    return bio.substring(0, 200) + (bio.lenght > 200 ? '...' : '');
  },
  actionButtons(cellData, renderType, currentRow) {
    if (renderType === 'display') return '';
    return ''; // TODO: It would be nice to return the number buttons
  },
  badge(cellData, renderType, currentRow) {
    if (renderType === 'display') return '';
    return cellData;
  },
  paperclip(cellData) {
    if (!cellData) return '';
    return '<i class="glyphicon glyphicon-paperclip"></i>';
  },
};
