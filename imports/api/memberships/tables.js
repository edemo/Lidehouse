import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';

import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export function ownershipColumns(community) {
  return [
    { data: 'createdAt.getTime()', width: '0px', render: Render.noDisplay },
    { data: 'displayParcel()', width: '125px', title: __('schemaParcels.ref.label') },
    Meteor.user().hasPermission('parcels.update', { communityId: community._id }) &&
      { data: 'parcelId', render: Render.actionButtons,
        createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'parcels', actions: 'view,edit,delete', size: 'sm' }, cell),
      },
    { data: 'user()', width: '0px', render: Render.userAvatar },
    { data: 'displayPartner()', title: __('name') },
    Meteor.user().hasPermission('partners.update', { communityId: community._id }) &&
      { data: 'partnerId', render: Render.actionButtons,
        createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'partners', actions: 'view,edit,delete', size: 'sm' }, cell),
      },
    { data: 'user()', title: __('bio'), width: '40%', render: Render.userBio },
    Meteor.user().hasPermission('ownership.update', { communityId: community._id }) &&
      { data: '_id', render: Render.actionButtons,
        createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'memberships', actions: 'view,edit,invite,delete', size: 'sm' }, cell),
      },
  ].filter(c => c);
}
