/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { UploadFS } from 'meteor/jalik:ufs';
import { XLSX } from 'meteor/huaming:js-xlsx';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '../api/parcels/parcels';

const rABS = true;
const delayCalls = 5000;

function transformMarinaParcel(doc) {
  if (doc.serial.indexOf('P') >= 0) {
    doc.type = 'parking';
  } else if (doc.serial.indexOf('T') >= 0) {
    doc.type = 'storage';
  } else {
    doc.type = 'flat';
    doc.building = doc.serial[0];
    doc.floor = doc.serial[1];
    doc.number = doc.serial[3];
  }
}

function transformMarinaMembership(doc) {
  const communityId = Session.get('activeCommunityId');
  const parcel = Parcels.findOne({ communityId, serial: doc.serial });
  doc.parcelId = parcel._id;
  doc.person.idCard.type = 'natural';
  doc.role = 'owner';
  doc.ownership = { share: new Fraction(1) };
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
      const jsons = XLSX.utils.sheet_to_json(worksheet).map(flatten.unflatten);

      let index = 0;
      const handleNextJson = function () {
        const communityId = Session.get('activeCommunityId');
        const doc = _.extend({}, jsons[index], { communityId });
        // ---- custom transformation ----
        const community = Communities.findOne(communityId);
        if (community.name.indexOf('Marina') >= 0) {
          if (collection._name === 'parcels') transformMarinaParcel(doc);
          if (collection._name === 'memberships') transformMarinaMembership(doc);
        }
        // ------------------------------
        collection.methods.insert.call(doc, onSuccess((res) => {
          displayMessage('success', 'Document %s inserted', res);
          index += 1;
          Meteor.setTimeout(handleNextJson, delayCalls);
        }));
      };
      handleNextJson();
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

