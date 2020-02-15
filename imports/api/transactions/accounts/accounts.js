import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Accounts = new Mongo.Collection('accounts');

Accounts.mainCategoryValues = ['asset', 'liability', 'equity', 'income', 'expense', 'technical'];
Accounts.simpleCategoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable']);
Accounts.categoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable', 'cash', 'bank']);
Accounts.syncValues = ['none', 'manual', 'auto'];

Accounts.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Accounts.categoryValues },
  name: { type: String, max: 100 },
  code: { type: String, max: 25, optional: true },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true, autoform: { omit: true } },
});

Accounts.cashExtensionSchema = new SimpleSchema({
  primary: { type: Boolean, optional: true },
});

Accounts.bankExtensionSchema = new SimpleSchema({
  primary: { type: Boolean, optional: true },
  bank: { type: String, max: 100, optional: true },
  BAN: { type: String, max: 100, optional: true },  // Bank Account Number
  sync: { type: String, defaultValue: 'none', allowedValues: Accounts.syncValues, autoform: _.extend({ value: 'none' }, autoformOptions(Accounts.syncValues, 'schemaAccounts.sync.')) },
//  protocol: { type: String, optional: true },
});

Meteor.startup(function indexMoneyAccounts() {
  if (Meteor.isServer) {
    Accounts._ensureIndex({ communityId: 1, code: 1 });
    Accounts._ensureIndex({ communityId: 1, name: 1 });
    Accounts._ensureIndex({ communityId: 1, category: 1, primary: -1 });
  }
});

Accounts.helpers({
  entityName() {
    const majorCategory = _.contains(['cash', 'bank'], this.category) ? this.category : 'simple';
    return majorCategory + 'Account';
  },
  nodes(leafsOnly = false) {
    const regexp = new RegExp('^' + this.code + (leafsOnly ? '.+' : ''));
    return Accounts.find({ communityId: this.communityId, code: regexp });
  },
  leafs() {
    return this.nodes(true);
  },
  parent() {
    // TODO
  },
  parents() {
    // TODO
  },
  displayAccount() {
    return `${this.code}: ${__(this.label || this.name)}`;
  },
  asOption() {
    return { label: this.displayAccount(), value: this.code };
  },
  nodeOptions(leafsOnly) {
    const nodes = this.nodes(leafsOnly);
    return nodes.map(node => node.asOption());
  },
});

Accounts.checkExists = function checkExists(communityId, code) {
  if (!code || !Accounts.findOne({ communityId, code })) {
    throw new Meteor.Error('err_notExists', `No such account: ${code}`);
  }
};

Accounts.coa = function coa(communityId = getActiveCommunityId()) {
  return Accounts.findOne({ communityId, code: '`' });
};

Accounts.all = function allAccounts(communityId) {
  const accounts = Accounts.find({ communityId }, { sort: { code: 1 } });
  return accounts;
};

Accounts.getByCode = function getByCode(code, communityId = getActiveCommunityId()) {
  return Accounts.findOne({ communityId, code });
};

Accounts.getByName = function getByName(name, communityId = getActiveCommunityId()) {
  return Accounts.findOne({ communityId, name });
};

Accounts.findPayinDigitByName = function findPayinDigitByName(name) {
  const tmpl = Templates.findOne('Condominium_Payins');
  const node = tmpl.accounts.find(a => a.name === name);
  return node.code;
};

Accounts.nodeOptionsOf = function nodeOptionsOf(communityId, code, leafsOnly) {
  const codes = (code instanceof Array) ? code : [code];
  const nodeOptions = codes.map(c => {
    const account = Accounts.findOne({ communityId, code: c });
    return account.nodes(leafsOnly).map(node => node.asOption());
  }).flat(1);
  if (leafsOnly) return nodeOptions;
  else return [Accounts.coa(communityId).asOption()].concat(nodeOptions);
};

Accounts.chooseSubAccount = function chooseSubAccount(code, leafsOnly = true) {
  return {
    options() {
      const communityId = Session.get('activeCommunityId');
      return Accounts.nodeOptionsOf(communityId, code, leafsOnly);
    },
    firstOption: false,
  };
};

Accounts.chooseAccountNode = {
  options() {
    const communityId = Session.get('activeCommunityId');
    return Accounts.all(communityId);
  },
  firstOption: () => __('(Select one)'),
};

Accounts.chooseLocalizerNode = {
  options() {
    const communityId = Session.get('activeCommunityId');
    return Accounts.all(communityId);
  },
  firstOption: () => __('(Select one)'),
};

Accounts.choosePayinType = {
  options() {
    const tmpl = Templates.findOne('condominiumPayinTypes');
    return tmpl.accounts.map(a => ({ label: a.name, value: a.digit }));
  },
  firstOption: () => __('(Select one)'),
};

Accounts.attachBaseSchema(Accounts.schema);
Accounts.attachBehaviour(Timestamped);

Accounts.attachVariantSchema(Accounts.cashExtensionSchema, { selector: { category: 'cash' } });
Accounts.attachVariantSchema(Accounts.bankExtensionSchema, { selector: { category: 'bank' } });
Accounts.simpleCategoryValues.forEach((category) => {
  Accounts.attachVariantSchema(undefined, { selector: { category } });
});

Meteor.startup(function attach() {
  Accounts.simpleSchema({ category: 'cash' }).i18n('schemaAccounts');
  Accounts.simpleSchema({ category: 'bank' }).i18n('schemaAccounts');
  Accounts.simpleCategoryValues.forEach((category) => {
    Accounts.simpleSchema({ category }).i18n('schemaAccounts');
  });
});

// --- Factory ---

Factory.define('simpleAccount', Accounts, {
  name: () => faker.random.word(),
  category: 'technical',
  code: '222',
  primary: true,
});

Factory.define('cashAccount', Accounts, {
  name: () => 'penzszla' + faker.random.word(),
  category: 'cash',
  code: '1',
  primary: true,
});

Factory.define('bankAccount', Accounts, {
  name: () => 'bankszla' + faker.random.word(),
  category: 'bank',
  code: '2',
  primary: true,
  BAN: faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  sync: 'manual',
});
