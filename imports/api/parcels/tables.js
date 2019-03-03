import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

Render.buttonAssignParcelOwner = function buttonAssignParcelOwner(cellData, renderType, currentRow) {
  const parcelId = cellData;
  const parcel = Parcels.findOne(parcelId);
  const userIcon = parcel.isLed() ? 'fa-user-o' : 'fa-user';
  let colorClass = '';
  if (Memberships.findOne({ parcelId, approved: false, active: true })) colorClass = 'text-danger';
  else {
    const representor = Memberships.findOne({ parcelId, active: true, 'ownership.representor': true });
    if (representor) {
      if (!representor.accepted) {
        if (!representor.personId) colorClass = 'text-warning';
        else colorClass = 'text-info';
      }
    } else {  // no representor
      if (Memberships.findOne({ parcelId, active: true, accepted: false })) {
        if (Memberships.findOne({ parcelId, active: true, personId: { $exists: false } })) colorClass = 'text-warning';
        else colorClass = 'text-info';
      }
    }
  }

  let html = '';
  html += `<a href="#occupants">`;
  html += `<button data-id=${cellData} title=${__('assign')} class="btn btn-white btn-xs js-assign">`;
  html += `<i class="fa ${userIcon} ${colorClass}"></i>`;
  html += `</button>`;
  html += `</a>`;
  return html;
};

Render.joinOccupants = function joinOccupants(occupants) {
  let result = '';
  occupants.forEach((m) => {
    const repBadge = m.isRepresentor() ? `<i class="fa fa-star" title=${__('representor')}></i>` : '';
    const occupancyDetail = m.ownership ? '(' + m.ownership.share.toStringLong() + ')' : '';
    result += `${m.Person().displayName()} ${occupancyDetail} ${repBadge}<br>`;
  });
  return result;
};

function renderLeadRef(cellData, renderType, currentRow) {
  const leadRef = cellData;
  const parcel = Parcels.findOne(currentRow._id);
  const leadParcel = parcel.leadParcel();
  const mark = !leadParcel ? ' class="bg-danger p-xs"' : '';
  const html = leadRef ? `<div${mark}>${leadRef}</div>` : '';
  return html;
}

export function parcelColumns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.assign) buttonRenderers.push(Render.buttonAssignParcelOwner);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  return [
    { data: 'ref', title: __('schemaParcels.ref.label') },
    { data: 'leadRef', title: __('schemaParcels.leadRef.label'), render: renderLeadRef },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'area', title: 'm2' },
    { data: 'share()', title: __('schemaParcels.units.label') },
    { data: 'occupants()', title: __('occupants'), render: Render.joinOccupants },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];
}

export function highlightMyRow(row, data, index) {
  const parcelId = data._id;
  const isMine = Memberships.findOne({ parcelId, personId: Meteor.userId() });
  if (isMine) {
    $(row).addClass('tr-bold');
  }
}
