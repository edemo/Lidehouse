import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { Delegations } from '/imports/api/delegations/delegations.js';

export function delegationColumns() {
  return [
    { data: 'sourcePerson().toString()', title: __('schemaDelegations.sourcePersonId.label') },
    { data: 'targetPerson().toString()', title: __('schemaDelegations.targetPersonId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translateWithScope('schemaDelegations.scope') },
    { data: 'scopeObject()', title: __('schemaDelegations.scopeObjectId.label'), render: Delegations.renderScopeObject },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function delegationFromMeColumns() {
  return [
    { data: 'targetPerson()', title: __('schemaDelegations.targetPersonId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translateWithScope('schemaDelegations.scope') },
    { data: 'scopeObject()', title: __('schemaDelegations.scopeObjectId.label'), render: Delegations.renderScopeObject },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function delegationToMeColumns() {
  return [
    { data: 'sourcePerson()', title: __('schemaDelegations.sourcePersonId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translateWithScope('schemaDelegations.scope') },
    { data: 'scopeObject()', title: __('schemaDelegations.scopeObjectId.label'), render: Delegations.renderScopeObject },
    { data: '_id', render: Render.buttonRemove },
  ];
}
