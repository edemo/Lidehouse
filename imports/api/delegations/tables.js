import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import '/imports/ui_3/views/blocks/action-buttons.js';

export function delegationColumns() {
  return [
    { data: 'sourcePerson().toString()', title: __('schemaDelegations.sourceId.label') },
    { data: 'targetPerson().toString()', title: __('schemaDelegations.targetId.label') },
    { data: 'scope', title: __('schemaDelegations.scope.label'), render: Render.translateWithScope('schemaDelegations.scope') },
    { data: 'scopeObject()', title: __('schemaDelegations.scopeObjectId.label'), render: Delegations.renderScopeObject },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'delegations', actions: 'edit,delete', size: 'sm' }, cell),
    },
  ];
}
