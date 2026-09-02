import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { checkRegisteredUser } from '/imports/api/method-checks.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Communities } from '/imports/api/communities/communities.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import { Transactions } from '/imports/api/accounting/transactions.js';

const pickFields = (doc, fields) => {
  const result = {};
  fields.forEach(field => {
    if (doc[field] !== undefined) result[field] = doc[field];
  });
  return result;
};

const billFields = [
  'communityId', 'serialId', 'valueDate', 'issueDate', 'deliveryDate', 'dueDate',
  'amount', 'tax', 'disco', 'outstanding', 'status', 'postedAt', 'note',
];

const lineFields = [
  'title', 'details', 'uom', 'quantity', 'unitPrice', 'discoPct', 'disco', 'taxPct', 'tax',
  'amount', 'localizer', 'parcelId', 'metering', 'billing',
];

const parcelFields = [
  '_id', 'communityId', 'ref', 'code', 'type', 'group', 'building', 'floor', 'door',
  'units', 'area', 'area1', 'area2', 'area3', 'volume',
];

const meterFields = ['_id', 'communityId', 'parcelId', 'identifier', 'service', 'uom'];

const parcelBillingFields = [
  '_id', 'communityId', 'title', 'digit', 'localizer', 'type', 'group',
  'consumption', 'projection', 'appliedAt',
];

function pickCommunity(community) {
  const result = pickFields(community, ['name', 'address']);
  result._id = community._id;
  result.settings = { language: community.settings?.language };
  if (community.settings?.currency) result.settings.currency = community.settings.currency;
  return result;
}

export const myBillsExport = new ValidatedMethod({
  name: 'accounting.myBillsExport',
  validate: new SimpleSchema({
    begin: { type: Date },
    end: { type: Date },
  }).validator(),

  run({ begin, end }) {
    if (Meteor.isClient) return;
    checkRegisteredUser(this.userId);
    const beginOfDay = moment(begin).startOf('day').toDate();
    const endOfDay = moment(end).endOf('day').toDate();

    // The flats the user owns: his partners, with their member contracts
    const partnerIds = Partners.find({ userId: this.userId }).fetch().map(p => p._id);
    const contracts = Contracts.find({ partnerId: { $in: partnerIds }, relation: 'member' }).fetch();
    const contractIds = contracts.map(c => c._id);
    const contractParcelIds = _.uniq(contracts.flatMap(c => [c.parcelId, c.leadParcelId]).filter(Boolean));

    // Posted bills within the date range, of the user's flats (contracts, or historically the same partner)
    const bills = Transactions.find({
      category: 'bill',
      status: 'posted',
      valueDate: { $gte: beginOfDay, $lte: endOfDay },
      $or: [{ contractId: { $in: contractIds } }, { partnerId: { $in: partnerIds } }],
    }, { sort: { valueDate: 1, serialId: 1 } }).fetch();

    const billParcelIds = _.uniq(bills.flatMap(b => (b.lines || []).map(l => l.parcelId)).filter(Boolean));
    const meterIds = _.uniq(bills.flatMap(b => (b.lines || []).map(l => l.metering?.id)).filter(Boolean));
    const parcelBillingIds = _.uniq(bills.flatMap(b => (b.lines || []).map(l => l.billing?.id)).filter(Boolean));

    return {
      communities: Communities.find({ _id: { $in: _.uniq(contracts.map(c => c.communityId)) } }, { sort: { name: 1 } }).fetch().map(pickCommunity),
      parcels: Parcels.find({ _id: { $in: _.uniq(contractParcelIds.concat(billParcelIds)) } }, { sort: { code: 1 } }).fetch().map(p => pickFields(p, parcelFields)),
      meters: Meters.find({ _id: { $in: meterIds } }, { sort: { identifier: 1 } }).fetch().map(m => pickFields(m, meterFields)),
      parcelBillings: ParcelBillings.find({ _id: { $in: parcelBillingIds } }, { sort: { title: 1 } }).fetch().map(pb => pickFields(pb, parcelBillingFields)),
      bills: bills.map(bill => _.extend(pickFields(bill, billFields), {
        lines: (bill.lines || []).filter(l => l).map(line => pickFields(line, lineFields)),
      })),
    };
  },
});