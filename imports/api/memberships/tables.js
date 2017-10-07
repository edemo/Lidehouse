import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function roleshipColumns() {
  return [
    { data: 'role', title: __('role'), render: Render.translate },
    { data: 'displayName()', title: __('user') },
    { data: 'user().emails[0].address', title: __('schemaUsers.emails.$.address.label') },
    { data: 'user().profile.phone', title: __('schemaUsers.profile.phone.label') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function ownershipColumns() {
  return [
    { data: 'displayName()', title: __('user') },
    { data: 'ownership.share', title: __('schemaMemberships.ownership.share.label') },
    { data: 'ownership.representor', title: __('schemaMemberships.ownership.representor.label'), render: Render.translate },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function benefactorshipColumns() {
  return [
    { data: 'displayName()', title: __('user') },
    { data: 'benefactorship.type', title: __('schemaMemberships.benefactorship.type.label'), render: Render.translate },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
