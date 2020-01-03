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
import '/imports/ui_3/views/blocks/readmore.js';
import { __ } from '/imports/localization/i18n.js';
import { Transformers } from './import-transformers.js';

const rABS = true;

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
      // ---- custom transformation ----
      const transformer = Transformers[collection._name][options.transformer || 'default'];
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
          body: 'Readmore',
          bodyContext: JSON.stringify(neededOps, null, 2),
        });
      });
    };
    if (rABS) reader.readAsBinaryString(file); else reader.readAsArrayBuffer(file);
  });
}

