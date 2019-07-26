/* globals FileReader */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { UploadFS } from 'meteor/jalik:ufs';
import { XLSX } from 'meteor/huaming:js-xlsx';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import '/imports/ui_3/views/modals/confirmation.js';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { MarinaTransformers } from './import-marina.js';

const rABS = true;

const DefaultTransformers = {
  memberships(jsons, options) {
    const tjsons = [];
    const communityId = Session.get('activeCommunityId');
    debugAssert(communityId);
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
  },
};

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
      const transformers = DefaultTransformers;
      if (community.name.indexOf('Marina') >= 0) _.extend(transformers, MarinaTransformers);
      const transformer = transformers[collection._name];
      if (transformer) jsons = transformer(jsons, options);
      // ------------------------------
      jsons.forEach(json => json.communityId = communityId);

      collection.methods.batch.test.call({ args: jsons }, function (err, res) {
        if (err) { displayError(err); return; }
        const neededOps = res;
        Modal.confirmAndCall(collection.methods.batch.upsert, { args: jsons }, {
          action: 'import data',
          message: __('This operation will do the following') + '<br>' +
            __('creates') + ' ' + neededOps.insert.length + __(' documents') + ',<br>' +
            __('modifies') + ' ' + neededOps.update.length + __(' documents') + ',<br>' +
            __('deletes') + ' ' + neededOps.remove.length + __(' documents') + ',<br>' +
            __('leaves unchanged') + ' ' + neededOps.noChange.length + __(' documents'),
        });
      });
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

