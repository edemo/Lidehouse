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
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

const rABS = true;
const delayCalls = 250;

function transformMarinaParcels(jsons) {
  const tjsons = jsons.map((doc) => {
    const tdoc = $.extend(true, {}, doc);
    if (tdoc.ref.indexOf('P') >= 0) {
      tdoc.type = 'parking';
    } else if (tdoc.ref.indexOf('T') >= 0) {
      tdoc.type = 'storage';
    } else {
      tdoc.type = 'flat';
      tdoc.building = doc.ref[0];
      tdoc.floor = doc.ref[1];
      tdoc.door = doc.ref[3];
    }
    return tdoc;
  });
  return tjsons;
}

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
    const names = doc.owners.split(/,|;|\n/);
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
  jsons.forEach((doc) => {
    const docRef = doc['Számla kelte'] + '@' + doc['Szállító neve adóigazgatási azonosító száma'] + '#' + doc['Számla száma, vevőkód, fogy hely az'];
    const bill = {
      ref: '>' + docRef,
      partner: doc['Szállító neve adóigazgatási azonosító száma'],
      valueDate: new Date(doc['Számla kelte']),
      amount: parseInt(doc['Számla összege'], 10),
      // debit is one of the '8' accounts
      credit: [{
        account: '46',
      }],
    };
    tjsons.push(bill);

    if (doc['A számla kiegyenlítésének időpontja']) {
      const payment = {
        ref: '<' + docRef,
        partner: doc['Szállító neve adóigazgatási azonosító száma'],
        valueDate: new Date(doc['A számla kiegyenlítésének időpontja']),
        amount: parseInt(doc['Számla összege'], 10),
//        amount: parseInt(doc['A számla kiegyenlítésének összege'], 10),
        debit: [{
          account: '46',
        }],
        // credit is one of the '38' accounts
      };
      tjsons.push(payment);
    }
  });
  return tjsons;
}

// Before upload: remove newline from columns
// convert all money columns to number (line 37, Dijbeszedo field is fishy)

function transformMarinaBalances(jsons, options) {
  const tjsons = [];
  jsons.forEach((doc) => {
    const date = moment(doc["Dátum"]);
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
        if (collection._name === 'parcels') jsons = transformMarinaParcels(jsons);
        if (collection._name === 'memberships') jsons = transformMarinaMemberships(jsons);
        if (collection._name === 'transactions') jsons = transformMarinaTransactions(jsons, options);
        if (collection._name === 'balances') jsons = transformMarinaBalances(jsons, options);
      }
      // ------------------------------

      let index = 0;
      const handleNextJson = function () {
        const doc = _.extend(jsons[index], { communityId });
        const scheduleNext = function (level, ...params) {
          displayMessage(level, ...params);
          index += 1;
          Meteor.setTimeout(handleNextJson, delayCalls);
        };

        // Skipping already existing docs
        if (collection._name === 'parcels') {
          if (!doc.ref) { scheduleNext('warning', 'Ref is missing from %s', doc); return; }
          const parcel = Parcels.findOne({ communityId, ref: doc.ref });
          if (parcel) { scheduleNext('warning', 'Document %s already exists', doc.ref); return; }
        }
        if (collection._name === 'memberships') {
          if (!doc.ref) { scheduleNext('warning', 'Ref is missing from %s', doc); return; }
          const parcel = Parcels.findOne({ communityId, ref: doc.ref });
          const membership = Memberships.findOne({ communityId, parcelId: parcel._id, 'person.idCard.name': doc.person.idCard.name });
          if (membership) { scheduleNext('warning', 'Document %s already exists', doc.ref + ':' + doc.person.idCard.name); return; }
        }
        if (collection._name === 'transactions') {
          const tx = Transactions.findOne({ communityId, ref: doc.ref });
          if (tx) { scheduleNext('warning', 'Document %s already exists', doc.ref); return; }
        }
        if (collection._name === 'balances') {
          const bal = Balances.findOne({ communityId, account: doc.account, localizer: doc.localizer, tag: doc.tag });
          if (bal) { scheduleNext('warning', 'Document %s already exists', doc.tag); return; }
        }

        // Inserting the doc into the db
        console.log('Importing: ', doc);
        collection.methods.insert.call(doc, function handler(err, res) {
          if (err) {
            console.error(err);
            scheduleNext('error', 'Document errored!!!', doc); return;
          }
          scheduleNext('success', 'Document %s inserted', res); return;
        });
      };

      handleNextJson();
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

