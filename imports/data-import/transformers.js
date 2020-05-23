import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import { Parser } from './parser.js';

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
  // Make sure your transformer clones the doc - in case there are several rounds, you dont want your original docs cleaned
  parcelships: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        if (!doc.leadParcelId) return; // When missing the field, it means the parcel leads itself
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
  memberships: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        if (!doc.partnerId) return; // When missing the field, it means the parcel is led -> no membership
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
  transactions: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      docs.forEach((doc) => {
        const tdoc = {}; $.extend(true, tdoc, doc);
        if (doc.category === 'bill') {
          tdoc.lines = [{
            title: doc.title,
            uom: 'piece',
            quantity: 1,
            unitPrice: doc.amount,
            account: doc.debit[0].account,
          }];
        }
        if (doc.category === 'payment') {
          if (!doc.valueDate) return;
          const paymentId = doc.serialId;
          const split = paymentId.split('/'); split[0] = 'SZ';
          const billId = split.join('/');
          tdoc.bills = [{
            id: Transactions.findOne({ serialId: billId })._id,
            amount: doc.amount,
          }];
          tdoc.payAccount = doc.credit[0].account;
        }
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
        const date = Parser.parseValue(doc["Dátum"], doc, 'Date');
        const tag = PeriodBreakdown.date2tag(date, 'C');
        const number = key => (Parser.parseValue(doc[key], doc, 'Number', { decimal: false }));
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
