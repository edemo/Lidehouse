import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { $ } from 'meteor/jquery';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';

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
  buttonView(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-view" title=${__('view')}><i class="fa fa-eye"></i></button>`;
    return html;
  },
  buttonViewLink(cellData, renderType, currentRow) {
    let html = '';
    html += `<a href="#view-target">`;
    html += `<button data-id=${cellData} class="btn btn-white btn-xs js-view" title=${__('view')}><i class="fa fa-eye"></i></button>`;
    html += `</a>`;
    return html;
  },
  buttonEdit(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-edit" title=${__('edit')}><i class="fa fa-pencil"></i></button>`;
    return html;
  },
  buttonDelete(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-delete" title=${__('delete')}><i class="fa fa-trash"></i></button>`;
    return html;
  },
  buttonRemove(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-remove" title=${__('remove')}><i class="fa fa-times"></i></button>`;
    return html;
  },
  buttonJoin(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-join" title=${__('join')}><i class="fa fa-suitcase"></i></button>`;
    return html;
  },
  buttonLink(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-link" title=${__('link')}><i class="fa fa-external-link"></i></button>`;
    return html;
  },
  buttonApply(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-apply" title=${__('apply')}><i class="fa fa-calendar-plus-o"></i></button>`;
    return html;
  },
  buttonGroup(buttonRenderers) {
    return function groupRenderer(cellData, renderType, currentRow) {
      let html = '<div class="btn-group">';
      buttonRenderers.forEach((renderer) => {
        html += renderer(cellData, renderType, currentRow);
      });
      html += '</div>';
      return html;
    };
  },
  buttonStatusChange(cellData) {
    const thisTopic = Topics.findOne(cellData);
    let html = `<div class="dropdown pull-left">
                  <a href="" data-toggle="dropdown" class="dropdown-toggle btn btn-xs btn-white" title="${__('statusChange')}"}>
                    <i class="fa fa-cogs"></i> 
                    <b class="caret"></b>
                  </a>
                  <ul class="slim-menu dropdown-menu animated fadeInDown m-t-xs">`;
    thisTopic.possibleNextStatuses().forEach((status) => {
      html += `<li>
                <a href="" class="js-status-change" data-id="${cellData}" data-status="${status.name}">
                  ${__('schemaTopics.status.' + status.name)}
                </a>
              </li>`;
    });
    html += '</ul></div>';
    return html;
  },
  buttonStatusUpdate(cellData) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-status-update" title=${__('statusUpdate')}><i class="fa fa-edit"></i></button>`;
    return html;
  },
};

Render.joinOccupants = function joinOccupants(occupants) {
  let result = '';
  occupants.forEach((m) => {
    const repBadge = m.isRepresentor() ? `<i class="fa fa-star" title=${__('representor')}></i>` : '';
    const occupancyDetail = m.ownership ? '(' + m.ownership.share.toStringLong() + ')' : '';
    result += `${m.Person().displayName()} ${occupancyDetail} ${repBadge}<br>`;
  });
  return result;
};
