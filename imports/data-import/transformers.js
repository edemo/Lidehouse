import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Period } from '/imports/api/accounting/periods/period.js';
import { Parser } from './parser.js';

function singlify(jsons) {
  const tjsons = [];
  jsons.forEach(json => {
    _.each(json, (value, key) => {
      if (key.indexOf('(') !== -1) {
        // TODO
      }
    });
  });
  return tjsons;
}

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
  contracts: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        if (!doc.leadParcelId) return; // When missing the field, it means the parcel leads itself => can use default contract
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
          const bill = Transactions.findOne({ serialId: billId });
          if (!bill) {
            Log.error('No bill found for payment', paymentId);
            return;
          }
          tdoc.bills = [{
            id: bill._id,
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
        const tag = Period.date2tag(date, 'C');
        const getNumberField = key => (Parser.parseValue(doc[key], doc, 'Number', { decimal: false }));
    //  '`381' name: 'Pénztár' },
    //  '`382', name: 'Folyószámla' },
    //  '`383', name: 'Megtakarítási számla' },
    //  '`384', name: 'Fundamenta' },
        tdocs.push({
          communityId: doc.communityId,
          account: '`381',
          tag,
          debit: getNumberField("Pénztár"),
        });
        tdocs.push({
          communityId: doc.communityId,
          account: '`382',
          tag,
          debit: getNumberField("K&H üzemeltetési számla"),
        });
        tdocs.push({
          communityId: doc.communityId,
          account: '`383',
          tag,
          debit: getNumberField("K&H felújítási számla") + getNumberField("K&H megtakarítási számla"),
        });
        const fundamentaAccountNames = Object.keys(doc).filter(key => key.startsWith('Fundamenta'));
        let fundamentaBalance = 0;
        fundamentaAccountNames.forEach(key => fundamentaBalance += getNumberField(key));
        tdocs.push({
          communityId: doc.communityId,
          account: '`384',
          tag,
          debit: fundamentaBalance,
        });
      });
      return tdocs;
    },
  },
  meterReadings: {
    default: (docs, options) => {
      console.log("meterReadigs transformer");
      const tdocs = [];
      docs.forEach((doc) => {
        const date = doc["Dátum"] ? Parser.parseValue(doc["Dátum"], doc, 'Date') : new Date();
        const serviceMap = {
          'Fűtés': 'Hőmennyiségmérő Érték',
          'Klíma': '2Hőmennyiségmérő Érték',
          'Hideg víz': 'Hidegvízmérő Érték',
          'Meleg víz': 'Melegvízmérő Érték',
        }
        const communityId = doc.communityId;
        const community = Communities.findOne(communityId);
        const parcel = Parcels.findOne({ communityId, ref: (''+doc["ajtó"]).padStart(3, '0') });
        const parcelId = parcel._id;
        const getNumberField = key => (Parser.parseValue(doc[key], doc, 'Number', { decimal: true }));
        community.meteredServices().forEach(service => {
          const meter = Meters.findOne({ communityId, parcelId, service });
          if (!meter) return;
          const value = getNumberField(serviceMap[service]);
          tdocs.push({
            communityId: doc.communityId,
            meterId: meter._id,
            type: 'reading',
            date,
            value,
            approved: true,
          });  
        });
      });
      return tdocs;
    },
  },
  statementEntries: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        if (!doc.ref && !doc.refType) return; // When missing this field, this is invalid -- can be the end row (total)
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
};
