/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { UploadFS } from 'meteor/jalik:ufs';
import { XLSX } from 'meteor/huaming:js-xlsx';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';

const rABS = true;
const delayCalls = 5000;

export function importCollectionFromFile(collection) {
  UploadFS.selectFile(function (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      let data = e.target.result;
      if (!rABS) data = new Uint8Array(data);
      const workbook = XLSX.read(data, { type: rABS ? 'binary' : 'array' });
      const sheetName = workbook.SheetNames[0]; // importing only the first sheet
      const worksheet = workbook.Sheets[sheetName];
      const jsons = XLSX.utils.sheet_to_json(worksheet);

      let index = 0;
      const handleNextJson = function () {
        const doc = _.extend({}, jsons[index], { communityId: Session.get('activeCommunityId') });
        // ---- custom transformation ----
        // MARINA parcels
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

