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
import { modifierChangesField, autoValueUpdate } from '/imports/api/mongo-utils.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { TemplatedMongoCollection } from '/imports/api/transactions/templates/templated-collection.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { Communities } from '/imports/api/communities/communities.js';

export const Accounts = new TemplatedMongoCollection('accounts', 'code');

Accounts.mainCategoryValues = ['asset', 'liability', 'equity', 'income', 'expense', 'balance', 'technical'];
Accounts.simpleCategoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable']);
Accounts.categoryValues = Accounts.mainCategoryValues.concat(['payable', 'receivable', 'cash', 'bank']);
Accounts.syncValues = ['none', 'manual', 'auto'];

Accounts.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  category: { type: String, allowedValues: Accounts.categoryValues, autoform: allowedOptions() },
  name: { type: String, max: 100 },
  code: { type: String, max: 25 },
  isGroup: { type: Boolean, optional: true, autoform: { omit: true } },
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

Meteor.startup(function indexAccounts() {
  if (Meteor.isServer) {
    Accounts._ensureIndex({ communityId: 1, code: 1 });
    Accounts._ensureIndex({ communityId: 1, name: 1 });
    Accounts._ensureIndex({ communityId: 1, category: 1, primary: -1 });
  }
});

Accounts.isPayableOrReceivable = function isPayableOrReceivable(code, communityId) {
  if (!code.startsWith('`') || code.startsWith('`0')) return false;
  const category = Accounts.findOneT({ code, communityId }).category;
  return (category === 'payable' || category === 'receivable');
};

Accounts.isTechnicalCode = function isTechnicalCode(accountCode) {
  return accountCode.substring(0, 2) === '`0';
};

Accounts.toTechnicalCode = function toTechnicalCode(accountCode) {
  debugAssert(accountCode.charAt(0) === '`', 'only CoA accounts have technical accounts');
  return '`0' + accountCode.substring(1);
};

Accounts.fromTechnicalCode = function fromTechnicalCode(accountCode) {
  debugAssert(Accounts.isTechnicalCode(accountCode));
  return '`' + accountCode.substring(2);
};

Accounts.toTechnical = function toTechnical(account) {
  debugAssert(account.code.charAt(0) === '`', 'only CoA accounts have technical accounts');
  if (account.code === '`') return Accounts.getByCode('`0', account.communityId);
  const technicalCode = Accounts.toTechnicalCode(account.code);
  const technicalAccount = _.extend({}, account, { _id: '0' + account._id, category: 'technical', code: technicalCode });
  return technicalAccount;
};

// TODO: Get these special accounts from configuration
Accounts.isCarriedOver = function isCarriedOver(code, communityId) {
  if (code === '`491' || code === '`492') return false; // Opening and closing accounts not carried over
  if (code.startsWith('`0')) {
    return (code.startsWith('`01') || code.startsWith('`02') || code.startsWith('`03') || code.startsWith('`04'));
  } else {
    return (code.startsWith('`1') || code.startsWith('`2') || code.startsWith('`3') || code.startsWith('`4'));
  }
};

Accounts.getRelationAccount = function getRelationAccount(community, relation) {
  let accountCode;
  if (relation === 'member') accountCode = '`33';
  else if (relation === 'customer') accountCode = '`31';
  else if (relation === 'supplier') accountCode = '`454';
  else debugAssert(false);
  if (community.settings.accountingMethod === 'cash') accountCode = Accounts.toTechnicalCode(accountCode);
  return accountCode;
};

Accounts.getUnidentifiedIncomeAccount = function getUnidentifiedIncomeAccount(community) {
  return '`431';
};

Accounts.getUnidentifiedExpenseAccount = function getUnidentifiedExpenseAccount(community) {
  return '`434';
};
// TODO end

Accounts.helpers({
  entityName() {
    const majorCategory = _.contains(['cash', 'bank'], this.category) ? this.category : 'simple';
    return majorCategory + 'Account';
  },
  nodes(communityId, leafsOnly = false) {
    debugAssert(communityId);
    const regexp = new RegExp('^' + this.code + (leafsOnly ? '.+' : ''));
    return Accounts.findTfetch({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  leafs(communityId) {
    debugAssert(communityId);
    return this.nodes(communityId, true);
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
  nodeOptions(communityId, leafsOnly) {
    const nodes = this.nodes(communityId, leafsOnly);
    return nodes.map(node => node.asOption());
  },
});

Accounts.toLocalize = function toLocalize(communityId) {  // These accounts' balances will be stored for each localization tag
  const Txdefs = Mongo.Collection.get('txdefs');
  const def = Txdefs.getByName('Partner exchange', communityId);
  productionAssert(def.debit.toString() === def.credit.toString(), "Don't mess with Partner exchange definition");
  return def.debit;
};

Accounts.directMove = function directMove(communityId, codeFrom, codeTo) {
  const Transactions = Mongo.Collection.get('transactions');
  const Balances = Mongo.Collection.get('balances');
  productionAssert(!Balances.findOne({ communityId, account: new RegExp('^' + codeTo) }), `Account ${codeTo} is already used in community ${communityId}`);
                    // TODO: Could handle this case with balance merging
  const txs = Transactions.find({ communityId });
  console.log('Replacing', codeFrom, 'with', codeTo, 'in Tx count', txs.count());
  txs.forEach(tx => {
    let needsUpdate = false;
    const newTx = {
      debit: tx.debit,
      credit: tx.credit,
    };
    newTx.debit?.forEach(je => {
      if (je.account.startsWith(codeFrom)) {
        je.account = je.account.replace(codeFrom, codeTo);
        needsUpdate = true;
      }
    });
    newTx.credit?.forEach(je => {
      if (je.account.startsWith(codeFrom)) {
        je.account = je.account.replace(codeFrom, codeTo);
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      Transactions.direct.update(tx._id, { $set: newTx });
    }
  });
  const bals = Balances.find({ communityId, account: new RegExp('^' + codeFrom) });
  bals.forEach(bal => {
    Balances.direct.update(bal._id, { $set: { account: bal.account.replace(codeFrom, codeTo) } });
  });
};

Accounts._move = function move(communityId, codeFrom, codeTo) {
  const Transactions = Mongo.Collection.get('transactions');
  const Balances = Mongo.Collection.get('balances');
  productionAssert(!Balances.findOne({ communityId, account: new RegExp('^' + codeTo),  $expr: { $ne: ['$debit', '$credit'] } }), `Account ${codeTo} is already used in community ${communityId}`);
                    // TODO: Could handle this case with balance merging
  const txs = Transactions.find({ communityId });
  txs.forEach(tx => {
    const need1 = tx.moveTransactionAccounts(codeFrom, codeTo);
    const need2 = tx.moveJournalEntryAccounts(codeFrom, codeTo);
    const _id = tx._id; delete tx._id;
    if (need1 || need2) {
      Transactions.direct.update(_id, { $set: tx });
    }
  });
  const bals = Balances.find({ communityId, account: new RegExp('^' + codeFrom) });
  bals.forEach(bal => {
    Balances.direct.update(bal._id, { $set: { account: bal.account.replace(codeFrom, codeTo) } });
  });
};

Accounts.move = function move(communityId, codeFrom, codeTo) {
  // Technical accounts should not be moved directy. They move indirectly.
  productionAssert(!Accounts.isTechnicalCode(codeFrom));
  productionAssert(!Accounts.isTechnicalCode(codeTo));
  const techCodeFrom = Accounts.toTechnicalCode(codeFrom);
  const techCodeTo = Accounts.toTechnicalCode(codeTo);
  Accounts._move(communityId, codeFrom, codeTo);
  Accounts._move(communityId, techCodeFrom, techCodeTo);
};

Accounts.moveTemplate = function move(templateId, codeFrom, codeTo) {
  console.log('Replacing', codeFrom, 'with', codeTo, 'in Tempalte', templateId);
  const template = Communities.findOne(templateId) || Communities.findOne({ name: templateId, isTemplate: true });
  productionAssert(template && template._id, `Could not find template named '${templateId}'`);
  Communities.find({ 'settings.templateId': template._id }).forEach(community => {
    Accounts.move(community._id, codeFrom, codeTo);
  });
};

_.extend(Accounts, {
  coa(communityId = getActiveCommunityId()) {
    return Accounts.findOneT({ communityId, code: '`' });
  },
  all(communityId) {
    return Accounts.findTfetch({ communityId }, { sort: { code: 1 } });
  },
  allWithTechnical(communityId) {
    const accounts = Accounts.findTfetch({ communityId });
    const technicalAccounts = accounts.map(a => Accounts.toTechnical(a));
    const allAccounts = accounts.concat(technicalAccounts);
    const sortedAccounts = _.sortBy(allAccounts, a => a.code);
    return _.uniq(sortedAccounts, true, a => a.code);
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Accounts.findOneT({ communityId, code });
  },
  getByName(name, communityId = getActiveCommunityId()) {
    return Accounts.findOneT({ communityId, name });
  },
  findPayinDigitByName(name) {
    const tmpl = Templates['Honline előírás nemek'];
    const node = tmpl.accounts.find(a => a.name === name);
    return node.code;
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Accounts.findTfetch({ communityId, code: regexp }, { sort: { code: 1 } });
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
  needsLocalization(code, communityId) {
    let result = false;
    const accountsToLocalize = Accounts.toLocalize(communityId);
    for (const c of accountsToLocalize) {
      const tc = Accounts.toTechnicalCode(c);
      if (code.startsWith(c) || code.startsWith(tc)) {
        result = true;
        break;
      }
    }
    return result;
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

// --- Before/after functions ---

function markGroupAccountsUpward(doc) {
  const code = doc.code;
  if (Accounts.find({ communityId: doc.communityId, code: new RegExp('^' + code) }).count() > 1) {
    Accounts.direct.update(doc._id, { $set: { isGroup: true } });
  }
  const parentCodes = [];
  for (let i = 1; i < code.length; i++) {
    const parentCode = code.slice(0, -1 * i);
    parentCodes.push(parentCode);
  }
  Accounts.direct.update({ communityId: doc.communityId, code: { $in: parentCodes } }, { $set: { isGroup: true } }, { multi: true });
}

function unmarkGroupAccountsUpward(doc) {
  const code = doc.code;
  let parentCode;
  for (let i = 1; i < code.length; i++) {
    parentCode = code.slice(0, -1 * i);
    if (Accounts.findOne({ communityId: doc.communityId, code: parentCode })) break;
  }
  if (Accounts.find({ communityId: doc.communityId, code: new RegExp('^' + parentCode) }).count() === 1) {
    Accounts.direct.update({ communityId: doc.communityId, code: parentCode }, { $set: { isGroup: false } });
  }
}

if (Meteor.isServer) {
  Accounts.after.insert(function (userId, doc) {
    markGroupAccountsUpward(doc);
  });

  Accounts.after.update(function (userId, doc, fieldNames, modifier, options) {
    if (modifierChangesField(this.previous, this, ['code'])) {
      unmarkGroupAccountsUpward(this.previous);
      markGroupAccountsUpward(doc);
    }
  });

  Accounts.after.remove(function (userId, doc) {
    unmarkGroupAccountsUpward(doc);
  });
}

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
