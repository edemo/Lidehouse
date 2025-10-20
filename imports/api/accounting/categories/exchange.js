import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Contracts, choosePartnerContract } from '/imports/api/contracts/contracts.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/accounting/txdefs/txdefs.js';

const exchangeSchema = new SimpleSchema({
  account: { type: String, optional: true, autoform: chooseConteerAccount('debit') },
//  toPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  toContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  toPartner: { type: String, optional: true, autoform: { ...choosePartnerContract } },
//  fromPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  fromContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  fromPartner: { type: String, optional: true, autoform: { ...choosePartnerContract } },
});

Transactions.categoryHelpers('exchange', {
  validate(oldDoc) {
    const accountSelector = {
      communityId: this.communityId,
      account: this.account,
      tag: 'T',
    };
    const amount = this.amount;
    let availableAmount;
    if (this.fromPartner) {
      availableAmount = Balances.get(_.extend({ partner: this.fromPartner }, accountSelector)).total();
    } else {
      availableAmount = Balances.get( accountSelector).total() // no partner means full account balance
                      - Balances.get(_.extend({ partner: 'All' }, accountSelector)).total();
    }
    availableAmount *= (-1);
    if (amount - (oldDoc?.amount || 0) > availableAmount) {
      throw new Meteor.Error('err_notAllowed', 'Amount is larger than what is available on the given account for this partner/contract', { availableAmount, amount, oldAmount: oldDoc?.amount });
    }
  },
  makeJournalEntries(accountingMethod) {
    this.debit = [{ amount: this.amount, account: this.account, partner: this.fromPartner }];
    this.credit = [{ amount: this.amount, account: this.account, partner: this.toPartner }];
    return { debit: this.debit, credit: this.credit };
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    if (this.account?.startsWith(codeFrom)) {
      this.account = this.account.replace(codeFrom, codeTo);
      return true;
    } else return false;
  },
});

Transactions.attachVariantSchema(exchangeSchema, { selector: { category: 'exchange' } });

Transactions.simpleSchema({ category: 'exchange' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('exchange', Transactions, {
  category: 'exchange',
  account: () => '`431',
  fromPartner: undefined,
  toPartner: () => Factory.get('member'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
