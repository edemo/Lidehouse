/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { UploadFS } from 'meteor/jalik:ufs';
import { XLSX } from 'meteor/huaming:js-xlsx';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import '/imports/ui_3/views/modals/confirmation.js';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

const rABS = true;

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

function transformMarinaMemberships(jsons) {
  const tjsons = [];
  const communityId = Session.get('activeCommunityId');
  jsons.forEach((doc) => {
    const parcel = Parcels.findOne({ communityId, ref: doc.ref.trim() });
    doc.parcelId = parcel._id;
    doc.person = doc.person || {};
    doc.person.idCard = doc.person.idCard || {};
    doc.person.contact = doc.person.contact || {};
    doc.person.idCard.type = 'natural';
    doc.role = 'owner';
    const names = doc.owners ? doc.owners.split(/,|;|\n/) : [];
    const emails = doc.emails ? doc.emails.split(/,|;| |\n/) : [];
    names.forEach((name) => {
      const tdoc = {}; $.extend(true, tdoc, doc);
      tdoc.person.idCard.name = name;
      tdoc.person.contact.email = emails[0] || undefined;
      tdoc.ownership = { share: new Fraction(1, names.length) };
      tjsons.push(tdoc);
    });
  });
  return tjsons;
}

// Before upload:
// remove '.' from column name
// convert two money columns to number
//
function transformMarinaTransactions(jsons, options) {
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
}

// Before upload: remove newline from columns
// convert all money columns to number (line 37, Dijbeszedo field is fishy)

function transformMarinaBalances(jsons, options) {
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
}

export function importCollectionFromFile(collection, options) {
  UploadFS.selectFile(function (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      let data = e.target.result;
      if (!rABS) data = new Uint8Array(data);
      const workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' });
      const sheetName = workbook.SheetNames[0]; // importing only the first sheet
      const worksheet = workbook.Sheets[sheetName];
      let jsons = XLSX.utils.sheet_to_json(worksheet).map(flatten.unflatten);

      const communityId = Session.get('activeCommunityId');
      const community = Communities.findOne(communityId);

      // ---- custom transformation ----
      if (community.name.indexOf('Marina') >= 0) {
        if (collection._name === 'memberships') jsons = transformMarinaMemberships(jsons);
        if (collection._name === 'transactions') jsons = transformMarinaTransactions(jsons, options);
        if (collection._name === 'balances') jsons = transformMarinaBalances(jsons, options);
      }
      // ------------------------------
      jsons.forEach(json => json.communityId = communityId);

/*
      let idSet;  // The set of fields, that identify uniquely an element within a community.
      switch (collection._name) {  // If we find such an item, we do an update, otherwise we will insert.
        case 'parcels': idSet = ['communityId', 'ref']; break;
        case 'memberships': idSet = ['communityId', 'role', 'parcelId', 'person.idCard.name', 'person.contact.email']; break;
        case 'transactions': idSet = ['communityId', 'ref']; break;
        case 'balances': idSet = ['communityId', 'account', 'localizer', 'tag']; break;
        case 'topics': idSet = ['communityId', 'category', 'serial']; break;
        default: debugAssert(false, `Cannot handle collection ${collection}`);
      }

      function hasChanges(newObj, oldObj) {
        let hasChange = false;
        _.each(newObj, (value, key) => {
          if (_.isEqual(value, oldObj[key])) {
            hasChange = key;
            return false;
          }
          return true;
        });
        return hasChange;
      }

      const neededOperations = { insert: [], update: [], remove: [], noChange: [] };
      jsons.forEach(json => {
        json.communityId = communityId;
        const selector = {};
        idSet.forEach(field => {
          selector[field] = json[field];
        });
        console.log("selector", selector);
        const existingDoc = collection.findOne(selector);
        if (!existingDoc) neededOperations.insert.push(json);
        else if (hasChanges(json, existingDoc)) {
          neededOperations.update.push({ _id: existingDoc._id, modifier: { $set: json } });
          console.log(`Field ${hasChanges(json, existingDoc)} has changed`);
        } else neededOperations.noChange.push(json);
      });
*/
      collection.methods.batch.test.call({ communityId, args: jsons }, function (err, res) {
        if (err) { displayError(err); return; }
        const neededOps = res;
        Modal.confirmAndCall(collection.methods.batch.upsert, { communityId, args: jsons },
/*      () => {
          if (neededOperations.insert.length > 0)
            collection.methods.batch.insert.call({ communityId, args: neededOperations.insert });
          if (neededOperations.update.length > 0)
            collection.methods.batch.update.call({ communityId, args: neededOperations.update });
        }, undefined, */
          {
            action: 'import data',
            message: __('This operation will do the following') + '<br>' +
              __('creates') + ' ' + neededOps.insert.length + __(' documents') + ',<br>' +
              __('modifies') + ' ' + neededOps.update.length + __(' documents') + ',<br>' +
              __('deletes') + ' ' + neededOps.remove.length + __(' documents') + ',<br>' +
              __('leaves unchanged') + ' ' + neededOps.noChange.length + __(' documents'),
          },
        );
      });
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

