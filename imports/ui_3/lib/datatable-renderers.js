import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { TicketStatusColors, possibleNextStatuses } from '/imports/api/topics/tickets/ticket-status.js';


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
  formatDate(cellData, renderType, currentRow) {
    return moment(cellData).format('L');
  },
  formatTime(cellData, renderType, currentRow) {
    return moment(cellData).format('L LT');
  },
  formatNumber(cellData, renderType, currentRow) {
    return numeral(cellData).format();
  },
  buttonView(cellData, renderType, currentRow) {
    const html = `<button data-id=${cellData} class="btn btn-white btn-xs js-view" title=${__('view')}><i class="fa fa-eye"></i></button>`;
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
  buttonGroup(buttonRenderers) {
    return function groupRenderer(cellData, renderType, currentRow) {
      let html = '<div class="btn-group">';
      buttonRenderers.forEach((renderer) => {
        html += renderer(cellData, renderType, currentRow);
      });
      html += '</div>';
      return html;
    };
  }, /*
  ticketButtonGroup(buttonRenderers) {
    return function groupRenderer(id) {
      const html = `
      <div class="btn-group">
        <button class="btn btn-xs btn-white js-edit" data-id=${id}><i class="fa fa-pencil"></i>${__('edit')}</button>
        <button class="btn btn-xs btn-white js-status" data-id=${id}><i class="fa fa-cog"></i>${__('status')}</button>
        <button class="btn btn-xs btn-white js-delete" data-id=${id}><i class="fa fa-trash"></i>${__('delete')}</button>
        <a href="/topic/${id}" class="btn btn-white btn-xs">
          <i class="fa fa-comments"></i>
          ${__('Comment')}
        </a>
      </div>`;
      return html;
    };*/
  ticketEditButton(cellData) {
    const html = `<button class="btn btn-xs btn-white js-edit" data-id=${cellData}><i class="fa fa-pencil"></i>${__('edit')}</button>`;
    return html;
  },
  ticketDeleteButton(cellData) {
    const html = `<button class="btn btn-xs btn-white js-delete" data-id=${cellData}><i class="fa fa-trash"></i>${__('delete')}</button>`;
    return html;
  },
  ticketStatusButton(cellData) {
    const thisTopic = Topics.findOne(cellData);
    // const html = `<button class="btn btn-xs btn-white js-status" data-id=${cellData}><i class="fa fa-cog"></i>${__('status')}</button>`;
    let html = `<div class="dropdown pull-left">
                  <a href="" data-toggle="dropdown" class="dropdown-toggle btn btn-xs btn-white">
                    <i class="fa fa-cog"></i> 
                    ${__('statusChange')} 
                    <b class="caret"></b>
                  </a>
                  <ul class="slim-menu dropdown-menu animated fadeInDown m-t-xs">`;
    possibleNextStatuses(thisTopic).forEach((status) => {
      html += `<li>
                <a href="" class="js-status" data-id="${cellData}" data-status="${status}">
                  ${__('schemaTickets.ticket.status.' + status)}
                </a>
              </li>`;
    });
    html += '</ul></div>';
    return html;
  },
  ticketCommentButton(cellData) {
    const html = `<a href="/topic/${cellData}" class="btn btn-white btn-xs"><i class="fa fa-comments"></i>${__('Comment')}</a>`;
    return html;
  },
  ticketButtonGroup(ticketButtonRenderers) {
    return function groupRenderer(cellData, renderType, currentRow) {
      let html = '<div class="btn-group">';
      ticketButtonRenderers.forEach((renderer) => {
        html += renderer(cellData, renderType, currentRow);
      });
      html += '</div>';
      return html;
    };
  },
  ticketStatus(cellData) {
    const html = `<span class='label label-${TicketStatusColors[cellData]}'>${__('schemaTickets.ticket.status.' + cellData)}</span>`;
    return html;
  },
};
