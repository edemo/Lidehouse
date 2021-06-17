import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';

export const Accounts = new Mongo.Collection('accounts');

Accounts.mainCategoryValues = ['asset', 'liability', 'equity', 'income', 'expense', 'technical'];
Accounts.simpleCategoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable']);
Accounts.categoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable', 'cash', 'bank']);
Accounts.syncValues = ['none', 'manual', 'auto'];
Accounts.toLocalize = '`33';  // This account's balances will be stored for each localizer

Accounts.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  category: { type: String, allowedValues: Accounts.categoryValues, autoform: allowedOptions() },
  name: { type: String, max: 100 },
  code: { type: String, max: 25 },
  locked: { type: Boolean, optional: true, autoform: { omit: true } },
  sign: { type: Number, allowedValues: [+1, -1], optional: true, autoform: { omit: true } },
});

Accounts.cashExtensionSchema = new SimpleSchema({
  category: { type: String, defaultValue: 'cash', autoform: { type: 'hidden', defaultValue: 'cash' } },
  primary: { type: Boolean, optional: true },
});

Accounts.bankExtensionSchema = new SimpleSchema({
  category: { type: String, defaultValue: 'bank', autoform: { type: 'hidden', defaultValue: 'bank' } },
  primary: { type: Boolean, optional: true },
  bank: { type: String, max: 100, optional: true },
  BAN: { type: String, max: 100, optional: true },  // Bank Account Number
//  sync: { type: String, defaultValue: 'none', allowedValues: Accounts.syncValues, autoform: _.extend({ value: 'none' }, autoformOptions) },
//  protocol: { type: String, optional: true },
});

Meteor.startup(function indexMoneyAccounts() {
  if (Meteor.isServer) {
    Accounts._ensureIndex({ communityId: 1, code: 1 });
    Accounts._ensureIndex({ communityId: 1, name: 1 });
    Accounts._ensureIndex({ communityId: 1, category: 1, primary: -1 });
  }
});

Accounts.isPayableOrReceivable = function isPayableOrReceivable(code, communityId) {
  if (!code.startsWith('`') || code.startsWith('`0')) return false;
  const category = Accounts.findOne({ code, communityId }).category;
  return (category === 'payable' || category === 'receivable');
};

Accounts.toTechnical = function toTechnical(account) {
  debugAssert(account.charAt(0) === '`', 'only CoA accounts have technical accounts');
  return '`0' + account.substring(1);
};

Accounts.helpers({
  entityName() {
    const majorCategory = _.contains(['cash', 'bank'], this.category) ? this.category : 'simple';
    return majorCategory + 'Account';
  },
  nodes(leafsOnly = false) {
    const regexp = new RegExp('^' + this.code + (leafsOnly ? '.+' : ''));
    return Accounts.find({ communityId: this.communityId, code: regexp }, { sort: { code: 1 } });
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

_.extend(Accounts, {
  checkExists(communityId, code) {
    if (!code || !Accounts.findOne({ communityId, code })) {
      throw new Meteor.Error('err_notExists', 'No such account', { code });
    }
  },
  coa(communityId = getActiveCommunityId()) {
    return Accounts.findOne({ communityId, code: '`' });
  },
  all(communityId) {
    return Accounts.find({ communityId }, { sort: { code: 1 } });
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Accounts.findOne({ communityId, code });
  },
  getByName(name, communityId = getActiveCommunityId()) {
    return Accounts.findOne({ communityId, name });
  },
  findPayinDigitByName(name) {
    const tmpl = Templates.findOne('Condominium_Payins');
    const node = tmpl.accounts.find(a => a.name === name);
    return node.code;
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Accounts.find({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  nodeOptionsOf(communityId, codeS, leafsOnly, addRootNode = false) {
    const codes = (codeS instanceof Array) ? codeS : [codeS];
    let nodeOptions = codes.map(code => {
      const nodes = Accounts.nodesOf(communityId, code, leafsOnly);
      return nodes.map(node => node.asOption());
    }).flat(1);
    if (codes.length > 1 && addRootNode) nodeOptions = [Accounts.coa(communityId).asOption()].concat(nodeOptions);
    return nodeOptions;
  },
  chooseSubNode(code, leafsOnly) {
    return {
      options() {
        const communityId = ModalStack.getVar('communityId');
        return Accounts.nodeOptionsOf(communityId, code, leafsOnly);
      },
      firstOption: false,
    };
  },
  chooseNode: {
    options() {
      const communityId = ModalStack.getVar('communityId');
      return Accounts.nodeOptionsOf(communityId, '`', false);
    },
    firstOption: () => __('(Select one)'),
  },
  choosePayinType: {
    options() {
      const communityId = ModalStack.getVar('communityId');
      const members = Accounts.getByName('Members', communityId);
      const options = Accounts.nodeOptionsOf(communityId, members.code, true);
      options.forEach(o => {
        o.label = o.label.substring(members.code.length); // keep just the end of it
        o.value = o.value.substring(members.code.length); // keep just the end of it
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  },
});

Accounts.attachBaseSchema(Accounts.schema);
Accounts.attachBehaviour(Timestamped);

Accounts.attachVariantSchema(Accounts.cashExtensionSchema, { selector: { category: 'cash' } });
Accounts.attachVariantSchema(Accounts.bankExtensionSchema, { selector: { category: 'bank' } });
Accounts.simpleCategoryValues.forEach((category) => {
  Accounts.attachVariantSchema(undefined, { selector: { category } });
});

Accounts.simpleSchema({ category: 'cash' }).i18n('schemaAccounts');
Accounts.simpleSchema({ category: 'bank' }).i18n('schemaAccounts');
Accounts.simpleCategoryValues.forEach((category) => {
  Accounts.simpleSchema({ category }).i18n('schemaAccounts');
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
