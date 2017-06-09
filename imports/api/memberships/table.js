/* eslint-disable no-new */
import Tabular from 'meteor/aldeed:tabular';
import { TAPi18n } from 'meteor/tap:i18n';

import { Memberships } from './memberships.js';

export const tableColumns = [
    { data: 'ownership.serial', title: TAPi18n.__('memberships.ownership.serial.label') },
    { data: 'location()', title: TAPi18n.__('memberships.ownership.location.label') },
    { data: 'ownership.type', title: TAPi18n.__('memberships.ownership.type.label') },
    { data: 'ownership.lot', title: TAPi18n.__('memberships.ownership.lot.label') },
    { data: 'ownership.size', title: TAPi18n.__('memberships.ownership.size.label') },
    { data: 'votingShares()', title: TAPi18n.__('memberships.ownership.share.label') },
    { data: 'ownerName()', title: TAPi18n.__('owner') },
];

// for aldeed:tabular datatable
new Tabular.Table({
  name: 'Memberships',
  collection: Memberships,
  columns: tableColumns,
  extraFields: ['userId', 'communityId'],
  responsive: true,
  autoWidth: false,
});
