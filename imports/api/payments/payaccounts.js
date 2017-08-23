import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { debugAssert } from '/imports/utils/assert.js';

export const PayAccounts = new Mongo.Collection('payaccounts');

// Physical is 'bank acount', 'cash register', 'paypal account'... must have exactly one
// Virtual is a category for mental accounting, can have many
// Locator is a type of Virtual that already has the Parcels included, plus you can define others
PayAccounts.typeValues = ['physical', 'virtual', 'locator'];

export const choosePayAccount = {
  options() {
    return PayAccounts.find({ communityId: Session.get('activeCommunityId') }).map(function option(account) {
      return { label: account.name, value: account._id };
    });
  },
};

let PayAccountSchema;
PayAccountSchema = new SimpleSchema({
  name: { type: String, max: 100 },
  children: { type: Array },
  'children.$': { type: PayAccountSchema },
});

PayAccounts.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  type: { type: String, allowedValues: PayAccounts.typeValues },
  children: { type: Array },
  'children.$': { type: PayAccountSchema },
});

PayAccounts.helpers({
});

PayAccounts.attachSchema(PayAccounts.schema);
PayAccounts.attachSchema(Timestamps);

// Meteor.startup(function attach() {
//   PayAccounts.simpleSchema().i18n('schemaPayAccounts');
// });

// Setting up collection permissions
const hasPermission = function hasPermission(userId, doc) {
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('payaccounts.update', doc.communityId);
};

PayAccounts.allow({
  insert(userId, doc) {
    return hasPermission(userId, doc);
  },
  update(userId, doc) {
    return hasPermission(userId, doc);
  },
  remove(userId, doc) {
    return hasPermission(userId, doc);
  },
});
