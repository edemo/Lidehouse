import { TAPi18n } from 'meteor/tap:i18n';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

const __ = TAPi18n.__;

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
