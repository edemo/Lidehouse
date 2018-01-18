import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function parcelColumns(permissions) {
  return [
    { data: 'serial', title: __('schemaParcels.serial.label') },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'area', title: __('schemaParcels.area.label') },
    { data: 'share()', title: __('schemaParcels.units.label') },
    { data: 'displayNames()', title: __('owner') + '/' + __('benefactor') },
    permissions.view ? { data: '_id', render: Render.buttonView } : {},
    permissions.edit ? { data: '_id', render: Render.buttonEdit } : {},
    permissions.assign ? { data: '_id', render: Render.buttonAssignParcelOwner } : {},
    permissions.delete ? { data: '_id', render: Render.buttonDelete } : {},
  ];
}
