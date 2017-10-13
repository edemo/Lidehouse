import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function communityColumns() {
  return [
    { data: 'name', title: __('name') },
    { data: '_id', render: Render.buttonJoin },
    { data: 'city', title: __('schemaCommunities.city.label') },
    { data: 'zip', title: __('schemaCommunities.zip.label') },
    { data: 'street', title: __('schemaCommunities.street.label') },
    { data: 'number', title: __('schemaCommunities.number.label') },
    { data: 'lot', title: __('schemaCommunities.lot.label') },
  ];
}

export function communityProfilesFront() {
  return [
    { data: 'name', title: __('name') },
    { data: 'city', title: __('schemaCommunities.city.label') },
    { data: 'zip', title: __('schemaCommunities.zip.label') },
    { data: 'street', title: __('schemaCommunities.street.label') },
    { data: 'number', title: __('schemaCommunities.number.label') },
    { data: 'lot', title: __('schemaCommunities.lot.label') },
    { data: 'admin()', title: __('admin') },
  ];
}
