import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import deepExtend from 'deep-extend';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

function flattenBankAccountNumber(BAN) {
  return BAN.trim().split('-').join();
}

export const Import = {
  findAccountByNumber(BAN) {
    return Accounts.findOne({ BAN });
  },
  findPartner(partnerText) {
    return partnerText;
  },
};


export const Transformers = {
  parcelships: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      docs.forEach((doc) => {
        if (doc.leadRef && doc.leadRef !== doc.ref) {
          const parcel = Parcels.findOne({ communityId, ref: doc.ref });
          productionAssert(parcel, `No parcel with this ref ${doc.ref}`);
          const leadParcel = Parcels.findOne({ communityId, ref: doc.leadRef });
          productionAssert(leadParcel, `No parcel with this ref ${doc.leadRef}`);
          const tdoc = {}; $.extend(true, tdoc, doc);
          tdoc.parcelId = parcel._id;
          tdoc.leadParcelId = leadParcel._id;
          tdocs.push(tdoc);
        }
      });
      return tdocs;
    },
  },
  memberships: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      docs.forEach((doc) => {
        if (!doc.idCard || !doc.idCard.name) return;
        const parcel = Parcels.findOne({ communityId, ref: doc.ref });
        productionAssert(parcel, `No parcel with this ref ${doc.ref}`);
        const partner = Partners.findOne({ communityId, 'idCard.name': doc.idCard.name });
        productionAssert(partner, `No partner with this name ${doc.idCard.name}`);
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdoc.parcelId = parcel._id;
        tdoc.partnerId = partner._id;
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
  // Before upload: convert all money columns to number
  balances: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        const date = moment.utc(doc["Dátum"]);
        const tag = `C-${date.year()}-${date.month() + 1}`;
        const number = key => (Number(doc[key]) || 0);
    //  '`381' name: 'Pénztár' },
    //  '`382', name: 'Folyószámla' },
    //  '`383', name: 'Megtakarítási számla' },
    //  '`384', name: 'Fundamenta' },
        tdocs.push({
          account: '`381',
          tag,
          debit: number("Pénztár"),
        });
        tdocs.push({
          account: '`382',
          tag,
          debit: number("K&H üzemeltetési számla"),
        });
        tdocs.push({
          account: '`383',
          tag,
          debit: number("K&H felújítási számla") + number("K&H megtakarítási számla"),
        });
        const fundamentaAccountNames = Object.keys(doc).filter(key => key.startsWith('Fundamenta'));
        let fundamentaBalance = 0;
        fundamentaAccountNames.forEach(key => fundamentaBalance += number(key));
        tdocs.push({
          account: '`384',
          tag,
          debit: fundamentaBalance,
        });
      });
      return tdocs;
    },
  },
};
