import { moment } from 'meteor/momentjs:moment';
import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

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
  },
};
