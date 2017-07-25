import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function roleshipColumns() {
  return [
    { data: 'userName()', title: __('user') },
    { data: 'role', title: __('role'), render: Render.translate },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function ownershipColumns() {
  return [
    { data: 'userName()', title: __('owner') },
    { data: 'ownership.share', title: __('schemaMemberships.ownership.share.label') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
