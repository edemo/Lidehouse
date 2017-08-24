import { moment } from 'meteor/momentjs:moment';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { __ } from '/imports/localization/i18n.js';

export const Render = {
  translate(cellData, renderType, currentRow) {
    return __(cellData);
  },
  formatDate(cellData, renderType, currentRow) {
    return moment(cellData).format('YYYY.MM.DD');
  },
  formatTime(cellData, renderType, currentRow) {
    return moment(cellData).format('YYYY.MM.DD hh:mm');
  },
  buttonView(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('view')} class="js-view nav-item glyphicon glyphicon-eye-open"></span>`;
    return html;
  },
  buttonEdit(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('edit')} class="js-edit nav-item icon-edit"></span>`;
    return html;
  },
  buttonDelete(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('delete')} class="js-delete nav-item icon-trash"></span>`;
    return html;
  },
  buttonRemove(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('remove')} class="js-remove glyphicon glyphicon-remove"></span>`;
    return html;
  },
  buttonJoin(cellData, renderType, currentRow) {
    const html = `<a href="#" data-id=${cellData} class="js-join">${__('join')}</a>`;
    return html;
  },
  buttonAssignParcelOwner(cellData, renderType, currentRow) {
    let html = `<a href=${FlowRouter.path('Parcel.owners', { _pid: cellData })}>`;
    html += `<span data-id=${cellData} title=${__('assign')} class="js-assign nav-item glyphicon glyphicon-user"></span>`;
    html += `</a>`;
    return html;
  },
};
