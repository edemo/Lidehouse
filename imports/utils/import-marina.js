import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';

function flattenBankAccountNumber(bankAccountNumber) {
  return bankAccountNumber.trim().split('-').join();
}

export const Import = {
  findAccountByNumber(BAN) {
    return { account: '382' };
    const flattenedBAN = flattenBankAccountNumber(BAN);
    const community = getActiveCommunity();
    const bankAccounts = community.bankAccounts;
    return bankAccounts.find(ba => flattenBankAccountNumber(ba.accountNumber) === flattenedBAN);
  },
  findPartner(partnerText) {
    return partnerText;
  },
};

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export const MarinaTransformers = {
  // Before upload:
  // remove '.' from column name
  // convert two money columns to number
  //
  transactions(jsons, options) {
    const tjsons = [];
    jsons.forEach((doc, i) => {
      const docRef = '' + (i+2) + '-' + doc['Számla kelte'] + '@' + doc['Szállító neve adóigazgatási azonosító száma'] + '#' + doc['Számla száma, vevőkód, fogy hely az'];
  //    const cutoffDate = moment(moment.utc('2019-06-01'));
      const incomingDate = moment(moment.utc(doc['A számla fizetési határideje'] || doc['Számla kelte']));
      if (!incomingDate.isValid()) console.error('ERROR: Invalid date in import', doc);
  //    if (incomingDate < cutoffDate) {
      const bill = {
        ref: '>' + docRef,
        partner: doc['Szállító neve adóigazgatási azonosító száma'],
        valueDate: incomingDate.toDate(),
        amount: parseInt(doc['Számla összege'], 10),
        // debit is one of the '8' accounts
        credit: [{
          account: '46',
        }],
      };
      tjsons.push(bill);
  //    }
      if (doc['A számla kiegyenlítésének időpontja']) {
        const paymentDate = moment(moment.utc(doc['A számla kiegyenlítésének időpontja']));
        if (!paymentDate.isValid()) console.error('ERROR: Invalid date in import', doc);
  //      if (paymentDate < cutoffDate) {
        const payment = {
          ref: '<' + docRef,
          partner: doc['Szállító neve adóigazgatási azonosító száma'],
          valueDate: paymentDate.toDate(),
          amount: parseInt(doc['Számla összege'], 10),
  //          amount: parseInt(doc['A számla kiegyenlítésének összege'], 10),
          debit: [{
            account: '46',
          }],
          // credit is one of the '38' accounts
        };
        tjsons.push(payment);
  //      }
      }
    });
    return tjsons;
  },

  // Before upload: remove newline from columns
  // convert all money columns to number (line 37, Dijbeszedo field is fishy)

  balances(jsons, options) {
    const tjsons = [];
    jsons.forEach((doc) => {
      const date = moment.utc(doc["Dátum"]);
      const tag = `C-${date.year()}-${date.month() + 1}`;
      const number = key => (Number(doc[key]) || 0);
  //  '381' name: 'Pénztár' },
  //  '382', name: 'Folyószámla' },
  //  '383', name: 'Megtakarítási számla' },
  //  '384', name: 'Fundamenta' },
      tjsons.push({
        account: '381',
        tag,
        debit: number("Pénztár"),
      });
      tjsons.push({
        account: '382',
        tag,
        debit: number("K&H üzemeltetési számla"),
      });
      tjsons.push({
        account: '383',
        tag,
        debit: number("K&H felújítási számla") + number("K&H megtakarítási számla"),
      });
      const fundamentaAccountNames = Object.keys(doc).filter(key => key.startsWith('Fundamenta'));
      let fundamentaBalance = 0;
      fundamentaAccountNames.forEach(key => fundamentaBalance += number(key));
      tjsons.push({
        account: '384',
        tag,
        debit: fundamentaBalance,
      });
    });
    return tjsons;
  },

  statementEntries(jsons, options) {
    const tjsons = [];
    jsons.forEach((json) => {
      const tjson = {
        ref: json['Tranzakció azonosító '],
        refType: json['Típus'],
        account: Import.findAccountByNumber(json['Könyvelési számla']).account,
        valueDate: json['Könyvelés dátuma'],
        amount: json['Összeg'],
        partner: Import.findPartner(json['Partner elnevezése']),
        note: json['Közlemény'],
        statementId: options.source,
//        reconciledId
      };
      if (options.keepOriginals) tjson.original = json;
      tjsons.push(tjson);
    });
    return tjsons;
  },
};
