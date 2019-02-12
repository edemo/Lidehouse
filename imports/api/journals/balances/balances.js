import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { AccountSchema, AccountSpecification } from '/imports/api/journals/account-specification.js';
import { Breakdowns } from '../breakdowns/breakdowns';

export const Balances = new Mongo.Collection('balances');

Balances.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  tag: { type: String },  // can be a period, end of a period, or a period closing tag 
  balances: { type: Object, blackbox: true, defaultValue: {}, optional: true },
  // account code -> Number, localizer code -> number, or full code -> number
});

Meteor.startup(function indexBalances() {
  Balances.ensureIndex({ communityId: 1, tag: 1 });
});

Balances.attachSchema(Balances.schema);

const BalanceDefSchema = new SimpleSchema([{
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  tag: { type: String },
}, AccountSchema]);

Balances.get = function get(def) {
  BalanceDefSchema.validate(def);
  const balance = Balances.findOne({ communityId: def.communityId, tag: def.tag });
  if (!balance) return 0;
  const account = AccountSpecification.fromDoc(def);
//  console.log('looking for code', account.toCode());
  if (def.account && def.localizer) throw Error('We dont store balaces for 2D accounts');
  let leafCodes;
  if (def.account) {
    const coa = Breakdowns.chartOfAccounts(def.communityId);
    const leafs = coa.leafsOf(def.account);
    leafCodes = leafs.map(leaf => '@' + leaf.code);
  }
  if (def.localizer) {
    const loc = Breakdowns.findOneByName('Localizer', def.communityId);
    const leafs = loc.leafsOf(def.localizer);
    leafCodes = leafs.map(leaf => '#' + leaf.code);
  }
  let result = 0;
//  console.log(leafCodes);
  leafCodes.forEach(leafCode => result += balance.balances[leafCode] || 0);
//  console.log('=', result);
  return result;
};
