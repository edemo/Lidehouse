import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function breakdownColumns() {
  const constrainText = function constrainText(text, charCount) {
    return (text.length > charCount) ?
      text.substr(0, charCount - 3) + '...' :
      text;
  };

  const displayNames = function displayNames(cellData, renderType, currentRow) {
    let result = '';
    cellData.forEach((name) => { if (name) result += __(name) + ', '; });
    return constrainText(result, 50);
  };

  return [
    { data: 'digit' },
    { data: 'name', /*title: __('schemaBreakdowns.name.label'),*/ render: Render.translate },
//    { data: 'type', title: __('schemaBreakdowns.type.label'), render: Render.translate },
    { data: 'nodeNames()', /*title: __('schemaBreakdowns.children.$.children.$.children.label'),*/ render: displayNames },
    { data: '_id', render: Render.buttonView },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
