import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

export function payaccountColumns() {
  const constrainText = function constrainText(text, charCount) {
    return (text.length > charCount) ?
      text.substr(0, charCount - 3) + '...' :
      text;
  };

  const displayNames = function displayNames(cellData, renderType, currentRow) {
    let result = '';
    cellData.forEach((name) => { if (name) result += name + ', '; });
    return constrainText(result, 50);
  };

  return [
    { data: 'name', title: __('schemaPayAccounts.name.label') },
//    { data: 'type', title: __('schemaPayAccounts.type.label'), render: Render.translate },
    { data: 'level1Names()', title: __('schemaPayAccounts.children.label'), render: displayNames },
    { data: 'level2Names()', title: __('schemaPayAccounts.children.$.children.label'), render: displayNames },
    { data: 'leafNames()', title: __('schemaPayAccounts.children.$.children.$.children.label'), render: displayNames },
    { data: '_id', render: Render.buttonView },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
