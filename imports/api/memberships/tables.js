import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function roleshipColumns(permissions) {
  return [
    { data: 'role', title: __('role'), render: Render.translate },
    { data: 'Person().displayName()', title: __('user') },
    { data: 'Person().user().profile.publicEmail', title: __('schemaUsers.emails.$.address.label') },
    { data: 'Person().user().profile.phone', title: __('schemaUsers.profile.phone.label') },
    permissions.view ? { data: '_id', render: Render.buttonView } : {},
    permissions.edit ? { data: '_id', render: Render.buttonEdit } : {},
    permissions.delete ? { data: '_id', render: Render.buttonDelete } : {},
  ];
}

export function ownershipColumns(permissions) {
  return [
    { data: 'Person().displayName()', title: __('user') },
    { data: 'ownership.share', title: __('schemaMemberships.ownership.share.label') },
    { data: 'ownership.representor', title: __('schemaMemberships.ownership.representor.label'), render: Render.translate },
    permissions.view ? { data: '_id', render: Render.buttonView } : {},
    permissions.edit ? { data: '_id', render: Render.buttonEdit } : {},
    permissions.delete ? { data: '_id', render: Render.buttonDelete } : {},
  ];
}

export function benefactorshipColumns(permissions) {
  return [
    { data: 'Person().displayName()', title: __('user') },
    { data: 'benefactorship.type', title: __('schemaMemberships.benefactorship.type.label'), render: Render.translate },
    permissions.view ? { data: '_id', render: Render.buttonView } : {},
    permissions.edit ? { data: '_id', render: Render.buttonEdit } : {},
    permissions.delete ? { data: '_id', render: Render.buttonDelete } : {},
  ];
}
