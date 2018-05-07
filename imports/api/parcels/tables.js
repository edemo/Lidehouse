import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Memberships } from '/imports/api/memberships/memberships.js';

Render.buttonAssignParcelOwner = function buttonAssignParcelOwner(cellData, renderType, currentRow) {
  const parcelId = cellData;
  const notification = Memberships.findOne({ parcelId, approved: false }) ? 'text-danger' : '';

  let html = `<a href=${FlowRouter.path('Parcel.owners', { _pid: cellData })}>`;
  html += `<span data-id=${cellData} title=${__('assign')} class="js-assign nav-item glyphicon glyphicon-user ${notification}"></span>`;
  html += `</a>`;
  return html;
};

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

export function highlightMyRow(row, data, index) {
  const parcelId = data._id;
  const isMine = Memberships.findOne({ parcelId, 'person.userId': Meteor.userId() });
  if (isMine) {
    $(row).addClass('tr-bold');
  }
}
