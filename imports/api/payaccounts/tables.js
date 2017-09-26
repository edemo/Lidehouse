import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

export function payaccountColumns() {
  const constrainText = function constrainText(text, charCount) {
    return (text.length > charCount) ?
      text.substr(0, charCount - 3) + '...' :
      text;
  };
  const displayMids = function displayMids(cellData, renderType, currentRow) {
    let result = '';
    cellData.forEach(c => result += c.name + ', ');
    return constrainText(result, 50);
  };
  const displayLeafs = function displayLeafs(cellData, renderType, currentRow) {
    let result = '';
    cellData.forEach(c =>
      c.children.forEach(cc =>
        result += PayAccounts.leafDisplay(cc.name) + ', '
      )
    );
    return constrainText(result, 50);
  };
  return [
    { data: 'name', title: __('schemaPayAccounts.name.label') },
//    { data: 'type', title: __('schemaPayAccounts.type.label'), render: Render.translate },
    { data: 'children', title: __('schemaPayAccounts.children.label'), render: displayMids },
    { data: 'children', title: __('schemaPayAccounts.children.$.children.label'), render: displayLeafs },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
