import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';import { $ } from 'meteor/jquery';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export function parcelColumns() {
  return [
    { data: 'ref', title: __('schemaParcels.ref.label') },
    { data: 'leadRef()', title: __('schemaParcels.leadRef.label') },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'area', title: 'm2' },
    { data: 'share()', title: __('schemaParcels.units.label') },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { _id: cellData, collection: 'parcels', actions: 'view,edit,occupants,meters,delete', size: 'sm' }),
    },
  ];
}

export function highlightMyRow(row, data, index) {
  const parcelId = data._id;
  const leadParcelId = Parcels.findOne(data._id).leadParcelId();
  const isMine = Memberships.findOne({ parcelId, personId: Meteor.userId() }) ||
    Memberships.findOne({ parcelId: leadParcelId, personId: Meteor.userId() });
  if (isMine) {
    $(row).addClass('tr-bold');
  }
}
