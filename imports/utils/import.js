/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { UploadFS } from 'meteor/jalik:ufs';
import { XLSX } from 'meteor/huaming:js-xlsx';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Memberships } from '/imports/api/memberships/memberships.js';

const rABS = true;
const delayCalls = 1000;

function transformMarinaParcels(jsons) {
  const tjsons = jsons.map((doc) => {
    const tdoc = $.extend(true, {}, doc);
    if (tdoc.serial.indexOf('P') >= 0) {
      tdoc.type = 'parking';
    } else if (tdoc.serial.indexOf('T') >= 0) {
      tdoc.type = 'storage';
    } else {
      tdoc.type = 'flat';
      tdoc.building = doc.serial[0];
      tdoc.floor = doc.serial[1];
      tdoc.number = doc.serial[3];
    }
    return tdoc;
  });
  return tjsons;
}

function transformMarinaMemberships(jsons) {
  const tjsons = [];
  const communityId = Session.get('activeCommunityId');
  jsons.forEach((doc) => {
    const parcel = Parcels.findOne({ communityId, serial: doc.serial });
    doc.parcelId = parcel._id;
    doc.person = doc.person || {};
    doc.person.idCard = doc.person.idCard || {};
    doc.person.contact = doc.person.contact || {};
    doc.person.idCard.type = 'natural';
    doc.role = 'owner';
    const names = doc.owners.split(/,|;|\n/);
    const emails = doc.emails.split(/,|;|\n/);
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

export function importCollectionFromFile(collection) {
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
          const parcel = Parcels.findOne({ communityId, serial: doc.serial });
          if (parcel) { scheduleNext('warning', 'Document %s already exists', doc.serial); return; }
        }
        if (collection._name === 'memberships') {
          const parcel = Parcels.findOne({ communityId, serial: doc.serial });
          const membership = Memberships.findOne({ communityId, parcelId: parcel._id, 'person.idCard.name': doc.person.idCard.name });
          if (membership) { scheduleNext('warning', 'Document %s already exists', doc.serial + ':' + doc.person.idCard.name); return; }
        }

        // Inserting the doc into the db
        if (doc.serial) {
          collection.methods.insert.call(doc, onSuccess((res) => {
            scheduleNext('success', 'Document %s inserted', res); return;
          }));
        }
      };

      handleNextJson();
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

