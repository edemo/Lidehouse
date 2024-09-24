/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Contracts } from './contracts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';

Meteor.publish('contracts.inCommunity', function contractsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (user.hasPermission('contracts.inCommunity', { communityId })) {
    const fields = user.hasPermission('partners.details', { communityId }) ? {} : Contracts.publicFields;
    return Contracts.find({ communityId }, { fields });
  } // Otherwise, only the active leaders of the community can be seen
  return this.ready();
});

Meteor.publishComposite('contracts.ofSelf', function contractsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;
  return {
    find() {
      return Partners.find({ communityId, userId: this.userId });
    },
    children: [{
      find(partner) {
        return Contracts.find({ communityId, partnerId: partner._id });
      },
    }, {
      find(partner) {
        return Balances.find({ communityId, partner: new RegExp('^' + partner._id) });
      },
    }],
  };
});

Meteor.publishComposite('contracts.ofEntitledOnes', function contractsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const memberships = user.memberships(communityId);
  const parcelIds = _.pluck(memberships.fetch(), 'parcelId');
  const parcels = parcelIds.map(pid => Parcels.findOne(pid)).filter(elem => elem);
  const entitledParcelIds = [];
  parcels.forEach(parcelDoc => {
    if (user.hasPermission('parcels.finances', parcelDoc)) {
      entitledParcelIds.push(parcelDoc._id);
    }
  });

  return {
    find() {
      return Contracts.find({ communityId, parcelId: { $in: entitledParcelIds } });
    },
    children: [{
      find(contract) {
        return Balances.find({ communityId, tag: 'T', partner: new RegExp(contract._id + '$') /* partner: contract.code() */ });
      },
    }, {
      find(contract) {
        return Parcels.find(contract.parcelId);
      },
      children: [{
        find(parcel) {
          return Meters.find({ parcelId: parcel._id });
        },
      }],
    }, {
      find(contract) {
        return Transactions.find({ communityId, category: 'bill', partnerId: contract.partnerId, contractId: contract._id }, { limit: 1, sort: { createdAt: -1 } });
      },
    }],
  };
});

Meteor.publishComposite('contracts.outstanding', function contractsOutstanding(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    selector: { type: String, allowedValues: ['localizer', 'partner'] },
    debtorsOnly: { type: Boolean, optional: true },
  }).validate(params);
  const { communityId, selector, debtorsOnly } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }

  const finderSelector = { communityId, tag: 'T', [selector]: { $exists: true } };
  if (debtorsOnly) _.extend(finderSelector, { $expr: { $ne: ['$debit', '$credit'] } });

  if (selector === 'partner') {
    return {
      find() {
        return Balances.find(finderSelector);
      },
      children: [{
        find(balance) {
          return Contracts.find({ partnerId: balance.partner.substring(0, 17), parcelId: { $exists: true } });
        },
        children: [{
          find(contract) {
            return Parcels.find(contract.parcelId);
          },
          children: [{
            find(parcel) {
              return Meters.find({ parcelId: parcel._id });
            },
          }],
        }, {
          find(contract) {
            return Transactions.find({ communityId, category: 'bill', partnerId: contract.partnerId, contractId: contract._id }, { limit: 1, sort: { createdAt: -1 } });
          },
        }],
      }],
    };
  } else if (selector === 'localizer') {
    return {
      find() {
        return Balances.find(finderSelector);
      },
      children: [{
        find(balance) {
          return Parcels.find({ communityId, code: balance.localizer });
        },
        children: [{
          find(parcel) {
            return Meters.find({ parcelId: parcel._id });
          },
        }],
      }],
    };
  } else {
    debugAssert(false);
    return undefined;
  }
});
