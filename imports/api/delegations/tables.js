import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function delegationFromMeColumns() {
  return [
    { data: 'targetUser()', title: __('schemaDelegations.targetUserId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translate },
    //    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function delegationToMeColumns() {
  return [
    { data: 'sourceUser()', title: __('schemaDelegations.sourceUserId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translate },
//    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: '_id', render: Render.buttonRemove },
  ];
}
