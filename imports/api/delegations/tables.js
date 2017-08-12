import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function delegationFromMeColumns() {
  return [
    { data: 'targetUser()', title: __('schemaDelegations.targetUserId.label') },
//    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function delegationToMeColumns() {
  return [
    { data: 'sourceUser()', title: __('schemaDelegations.sourceUserId.label') },
//    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: '_id', render: Render.buttonRemove },
  ];
}
