import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/timestamps.js';

export const Vouchers = new Mongo.Collection('vouchers');

Vouchers.schema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  archive: { type: String, optional: true, autoform: fileUpload },
};

Vouchers.helpers({
});

Vouchers.attachSchema(Vouchers.schema);
Vouchers.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Vouchers.simpleSchema().i18n('schemaVouchers');
});
