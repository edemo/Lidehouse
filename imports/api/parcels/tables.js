import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function parcelColumns() {
  return [
    { data: 'serial', title: __('schemaParcels.serial.label') },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'size', title: __('schemaParcels.size.label') },
    { data: 'share()', title: __('schemaParcels.units.label') },
    { data: 'ownerName()', title: __('owner') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonAssignParcelOwner },
    { data: '_id', render: Render.buttonDelete },
  ];
}
