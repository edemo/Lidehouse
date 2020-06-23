import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { allowedOptions, imageUpload } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Vouchers = new Mongo.Collection('vouchers');

Vouchers.schema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  archive: { type: String, optional: true, autoform: imageUpload() },
};

Vouchers.helpers({
});

Vouchers.attachSchema(Vouchers.schema);
Vouchers.attachBehaviour(Timestamped);

Vouchers.simpleSchema().i18n('schemaVouchers');
