import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouter } from 'meteor/kadira:flow-router';

const __ = TAPi18n.__;

export const Render = {
  translate(cellData, renderType, currentRow) {
    return __(cellData);
  },
  formatTime(cellData, renderType, currentRow) {
    return moment(cellData).format('YYYY.MM.DD hh:mm');
  },
  buttonView(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} class="js-view nav-item glyphicon glyphicon-eye-open"></span>`;
    return html;
  },
  buttonEdit(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
    return html;
  },
  buttonDelete(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
    return html;
  },
  buttonRemove(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} class="js-remove glyphicon glyphicon-remove"></span>`;
    return html;
  },
  buttonJoin(cellData, renderType, currentRow) {
    const html = `<a href="#" data-id=${cellData} class="js-join">${__('join')}</a>`;
    return html;
  },
  buttonAssignParcelOwner(cellData, renderType, currentRow) {
    let html = `<a href=${FlowRouter.path('Parcel.owners', { _pid: cellData })}>`;
    html += `<span data-id=${cellData} class="js-assign nav-item glyphicon glyphicon-user"></span>`;
    html += `</a>`;
    return html;
  },
};
