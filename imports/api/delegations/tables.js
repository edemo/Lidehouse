import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';import { $ } from 'meteor/jquery';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Delegations } from '/imports/api/delegations/delegations.js';

export function delegationColumns() {
  return [
    { data: 'sourcePerson().toString()', title: __('schemaDelegations.sourcePersonId.label') },
    { data: 'targetPerson().toString()', title: __('schemaDelegations.targetPersonId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translateWithScope('schemaDelegations.scope') },
    { data: 'scopeObject()', title: __('schemaDelegations.scopeObjectId.label'), render: Delegations.renderScopeObject },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { _id: cellData, collection: 'delegations', actions: 'edit,delete', size: 'sm' }),
    },
  ];
}
