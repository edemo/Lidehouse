import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Communities } from './communities.js';

function linkToCommunityPage(cellData, renderType, currentRow) {
  const communityId = cellData;
  const community = Communities.findOne(communityId);
  const html = `<a href="${FlowRouter.path('Community show', { _cid: communityId })}">${community.name}</a>`;
  return html;
}

export function communityColumns() {
  return [
    { data: '_id', render: linkToCommunityPage, title: __('name') },
    { data: 'city', title: __('schemaCommunities.city.label') },
    { data: 'zip', title: __('schemaCommunities.zip.label') },
    { data: 'street', title: __('schemaCommunities.street.label') },
    { data: 'number', title: __('schemaCommunities.number.label') },
    { data: 'lot', title: __('schemaCommunities.lot.label') },
    { data: 'admin()', title: __('admin') },
  ];
}
