import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

export const Render = {
  translate(cellData, renderType, currentRow) {
    return __(cellData);
  },
  translateWithScope(scope) {
    return function translate(cellData, renderType, currentRow) {
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
    const html = `<span data-id=${cellData} title=${__('view')} class="js-view nav-item glyphicon glyphicon-eye-open"></span>`;
    return html;
  },
  buttonEdit(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('edit')} class="js-edit nav-item glyphicon glyphicon-pencil"></span>`;
    return html;
  },
  buttonDelete(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('delete')} class="js-delete nav-item glyphicon glyphicon-trash"></span>`;
    return html;
  },
  buttonRemove(cellData, renderType, currentRow) {
    const html = `<span data-id=${cellData} title=${__('remove')} class="js-remove glyphicon glyphicon-remove"></span>`;
    return html;
  },
  buttonJoin(cellData, renderType, currentRow) {
    const html = `<button class="btn-white btn btn-xs js-join"><i class="fa fa-suitcase"></i> ${__('join')}</button>`;
    return html;
  },
};
