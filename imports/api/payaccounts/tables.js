import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

export function payaccountColumns() {
  const constrainText = function constrainText(text, charCount) {
    return (text.length > charCount) ?
      text.substr(0, charCount - 3) + '...' :
      text;
  };
  const displayLevel1s = function displayLevel1s(cellData, renderType, currentRow) {
    let result = '';
    cellData.children.forEach(c => result += c.name + ', ');
    return constrainText(result, 50);
  };
  const displayLevel2s = function displayLevel2s(cellData, renderType, currentRow) {
    let result = '';
    cellData.children.forEach(c =>
      c.children.forEach(cc =>
        result += cc.name + ', ')
      );
    return constrainText(result, 50);
  };
  const displayLeafs = function displayLeafs(cellData, renderType, currentRow) {
    let result = '';
    cellData.children.forEach(c =>
      c.children.forEach(cc =>
        cc.children.forEach(ccc =>
          result += cellData.leafDisplay(ccc.name) + ', '
        )
      )
    );
    return constrainText(result, 50);
  };
  return [
    { data: 'name', title: __('schemaPayAccounts.name.label') },
//    { data: 'type', title: __('schemaPayAccounts.type.label'), render: Render.translate },
    { data: 'init()', title: __('schemaPayAccounts.children.label'), render: displayLevel1s },
    { data: 'init()', title: __('schemaPayAccounts.children.$.children.label'), render: displayLevel2s },
    { data: 'init()', title: __('schemaPayAccounts.children.$.children.$.children.label'), render: displayLeafs },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
