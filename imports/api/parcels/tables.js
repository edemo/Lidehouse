import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Memberships } from '/imports/api/memberships/memberships.js';

Render.buttonAssignParcelOwner = function buttonAssignParcelOwner(cellData, renderType, currentRow) {
  const parcelId = cellData;
  const notification = Memberships.findOne({ parcelId, approved: false }) ? 'text-danger' : '';

  let html = '';
  html += `<a href=${FlowRouter.path('Parcel.owners', { _pid: cellData })}>`;
  html += `<button data-id=${cellData} title=${__('assign')} class="btn btn-white btn-xs js-assign">`;
  html += `<i class="fa fa-user ${notification}"></i>`;
  html += `</button></a>`;
  return html;
};

export function parcelColumns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.assign) buttonRenderers.push(Render.buttonAssignParcelOwner);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  return [
    { data: 'serial', title: __('schemaParcels.serial.label') },
    { data: 'location()', title: __('schemaParcels.location.label') },
    { data: 'type', title: __('schemaParcels.type.label'), render: Render.translate },
    { data: 'lot', title: __('schemaParcels.lot.label') },
    { data: 'area', title: 'm2' },
    { data: 'share()', title: __('schemaParcels.units.label') },
    { data: 'displayActiveOccupants()', title: __('occupants') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];
}

export function highlightMyRow(row, data, index) {
  const parcelId = data._id;
  const isMine = Memberships.findOne({ parcelId, 'person.userId': Meteor.userId() });
  if (isMine) {
    $(row).addClass('tr-bold');
  }
}
