import { TAPi18n } from 'meteor/tap:i18n';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

const __ = TAPi18n.__;

export function delegationFromMeColumns() {
  return [
    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: 'targetUser()', title: __('schemaDelegations.targetUserId.label') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function delegationToMeColumns() {
  return [
    { data: 'sourceUser()', title: __('schemaDelegations.sourceUserId.label') },
    { data: 'object()', title: __('schemaDelegations.objectId.label') },
    { data: 'votingShare()', title: __('votingShare') },
    { data: '_id', render: Render.buttonRemove },
  ];
}
