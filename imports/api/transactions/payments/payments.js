import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { equalWithinUnit } from '/imports/localization/localization.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Relations } from '/imports/api/core/relations.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';

export const Payments = {};

export const chooseBillOfPartner = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
//    const amount = AutoForm.getFieldValue('amount');
//    const bills = Transactions.find({ communityId, category: 'bill', relation, outstanding: { $gt: 0, $lte: amount } });
//    const billByProximity = _.sortBy(bills.fetch(), b => (b.oustanding - amount));
    const onFormAllocatedBillIds = _.pluck(AutoForm.getFieldValue('bills'), 'id');
    const selector = { communityId, category: 'bill', relation, partnerId, status: { $ne: 'void' }, outstanding: { $ne: 0 }, _id: { $nin: onFormAllocatedBillIds } };
    const bills = Transactions.find(Object.cleanUndefined(selector), { sort: { createdAt: -1 } });
    const options = bills.map(function option(bill) {
      return { label: bill.displayInSelect(), value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

export const chooseLocalizerOfPartner = {
/*  To dynamically select localizer, when changing the partner on the payment:
  value() {
    const contractId = AutoForm.getFieldValue('contractId');
    const contract = contractId && Contracts.findOne(contractId);
    return contract?.accounting?.localizer;
  },
*/
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
    let localizers;
    if (relation === 'member') {
      const selector = Object.cleanUndefined({ communityId, relation: 'member', partnerId, leadParcelId: { $exists: false } });
      const contracts = Contracts.find(selector);
      const parcels = contracts.map(m => m.parcel());
      localizers = parcels.length ? parcels : Parcels.find({ communityId, category: '@property' });
    } else {
      localizers = Parcels.find({ communityId });
    }
    const options = localizers.map(p => ({ label: p.displayAccount(), value: p.code }));
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
//  firstOption: () => __('Localizers'),
  firstOption: false,
};

const billPaidSchema = {
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseBillOfPartner } },
  amount: { type: Number, decimal: true, autoform: { defaultValue: 0 } },
};
_.each(billPaidSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.billPaidSchema = new SimpleSchema(billPaidSchema);

const lineSchema = {
  amount: { type: Number, decimal: true, autoform: { defaultValue: 0 } },
  account: { type: String /* account code */, autoform: chooseConteerAccount(), optional: true },
  localizer: { type: String /* account code */, autoform: { ...chooseLocalizerOfPartner }, optional: true },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
};
_.each(lineSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.lineSchema = new SimpleSchema(lineSchema);

const extensionSchema = {
  valueDate: { type: Date }, // same as Tx, but we need the readonly added
  payAccount: { type: String, optional: true, autoform: chooseConteerAccount(true) },
};
_.each(extensionSchema, val => val.autoform = _.extend({}, val.autoform, { readonly() { return !!ModalStack.getVar('statementEntry'); } }));
Payments.extensionSchema = new SimpleSchema(extensionSchema);

const paymentSchema = new SimpleSchema([
  Transactions.partnerSchema,
  Payments.extensionSchema, {
    bills: { type: [Payments.billPaidSchema], optional: true },
    lines: { type: [Payments.lineSchema], optional: true },
    outstanding: { type: Number, decimal: true, optional: true },
  },
]);

Transactions.categoryHelpers('payment', {
  displayEntityName() {
    return __(`schemaPayments.paymentSubType.options.${this.subType()}`);
  },
  subType() {
    return this.txdef().data.paymentSubType;
  },
  getBills() {
    return (this.bills || []).filter(b => b); // nulls can be in the array, on the UI, when lines are deleted
  },
  getBillDocs() {
    return this.getBills().map(bp => Transactions.findOne(bp.id));
  },
  getLines() {
    return (this.lines || []).filter(l => l);
  },
  getBillTransactions() {
    return this.getBills().map(bill => Transactions.findOne(bill.id));
  },
  billCount() {
    return this.getBills().length;
  },
  allocatedToBills() {
    let allocated = 0;
    this.getBills().forEach(bill => allocated += bill.amount);
    return allocated;
  },
  allocatedToNonBills() {
    let allocated = 0;
    this.getLines().forEach(line => allocated += line.amount);
    return allocated;
  },
  allocatedSomewhere() {
    return this.allocatedToBills() + this.allocatedToNonBills();
  },
  unallocated() {
    return this.amountWoRounding() - this.allocatedSomewhere();
  },
  calculateOutstanding() {
    if (this.status === 'void') return 0;
    return this.unallocated();
  },
  hasConteerData() {
    let result = true;
    if (!this.payAccount) result = false;
    this.getLines().forEach(line => { if (line && !line.account) result = false; });
    return result;
  },
  correspondingBillTxdef() {
    return Txdefs.findOneT({ communityId: this.communityId, category: 'bill', 'data.relation': this.relation });
  },
  validate(oldDoc) {
    let billSum = 0;
    const payment = this;
    const partnerOrContract = this.contractId ? this.contract() : this.partner();
    const availableAmount = partnerOrContract.outstanding(this.payAccount, this.relation) * -1;
    if (this.subType() === 'identification' && this.amount - (oldDoc?.amount || 0) > availableAmount) {
      throw new Meteor.Error('err_notAllowed', 'Amount is larger than what is available on the given account for this partner/contract', { availableAmount, amount: this.amount, oldAmount: oldDoc?.amount });
    }
    this.getBills().forEach(pb => {
      const bill = Transactions.findOne(pb.id);
      function checkBillMatches(field) {
        if (bill[field] !== payment[field]) {
          throw new Meteor.Error('err_sanityCheckFailed', 'All paid bills need to have same field', `field: ${field}, ${bill[field]} !== ${payment[field]}`);
        }
      }
      checkBillMatches('relation'); checkBillMatches('partnerId'); checkBillMatches('contractId');
      productionAssert(pb.amount < 0 === bill.amount < 0, 'Bill amount and its payment must have the same sign');
      let amountToPay = bill.outstanding;
      const savedPayment = _.find(bill.getPayments(), p => p.id === this._id);
      if (savedPayment) savedPayment > 0 ? amountToPay -= savedPayment.amount : amountToPay += savedPayment.amount;
      if ((amountToPay > 0 && pb.amount > amountToPay) || (amountToPay < 0 && pb.amount < amountToPay)) {
        throw new Meteor.Error('err_sanityCheckFailed', "Bill's payment amount cannot exceed bill's amount", `${pb.amount} - ${amountToPay}`);
      }
      billSum += pb.amount;
    });
    if ((this.amount >= 0 && billSum > this.amount) || (this.amount <= 0 && billSum < this.amount)) {
      throw new Meteor.Error('err_sanityCheckFailed', "Bills' amounts cannot exceed payment's amount", `${billSum} - ${this.amount}`);
    }
    if (this.subType() === 'remission' && billSum !== this.amount) {
      throw new Meteor.Error('err_sanityCheckFailed', 'Remission has to be fully allocated to bills', `${billSum} - ${this.amount}`);
    }
    let lineSum = 0;
    const lineValues = [];
    this.getLines().forEach(line => {
      lineSum += line.amount;
      lineValues.push(line.amount);
    });
    productionAssert(lineValues.every((val) => val >= 0) || lineValues.every((val) => val <= 0), 'All lines must have the same sign');
    if ((this.amount >= 0 && lineSum > this.amount) || (this.amount <= 0 && lineSum < this.amount)) {
      throw new Meteor.Error('err_sanityCheckFailed', "Lines amounts cannot exceed payment's amount", `${lineSum} - ${this.amount}`);
    }
    if (this.unallocated() !== 0) {
      if (Math.abs(this.unallocated()) > Math.abs(this.amount)
        || Math.sign(this.amountWoRounding()) !== Math.sign(this.unallocated())) {
        throw new Meteor.Error('err_notAllowed', 'Remainder should not be a supplement', { unallocated: this.unallocated() });
      }
      if (this.subType() === 'identification') {
        throw new Meteor.Error('err_notAllowed', 'Identification should not have an unindentified amount', { unallocated: this.unallocated() });
      }
    }
    const connectedBillIds = _.pluck(this.getBills(), 'id');
    if (connectedBillIds.length !== _.uniq(connectedBillIds).length) {
      throw new Meteor.Error('err_notAllowed', 'Same bill may not be selected multiple times', `connectedBillIds: ${connectedBillIds}`);
    }
  },
  validateForPost() {
    this.getBills().forEach(pb => {
      const bill = Transactions.findOne(pb.id);
      if (!bill.isPosted()) throw new Meteor.Error('err_notAllowed', 'Bill has to be posted first');
    });
    if (!this.hasConteerData()) throw new Meteor.Error('err_notAllowed', 'Transaction has to be account assigned first');
  },
  autoAllocate() {
    if (!this.amount) return;
    let amountToAllocate = this.amount;
    for (const pb of this.getBills()) {
      if (!pb?.id) continue; // can be null, when a line is deleted from the array
      const bill = Transactions.findOne(pb.id);
      let billOutstanding = bill.outstanding;
      if (this._id) {   // if this is not insert operation, the payment may already be on the bill
        const thisPaymentOnBill = bill.payments?.find(p => p.id === this._id);
        if (thisPaymentOnBill) billOutstanding += thisPaymentOnBill.amount;
      }
      const sameSign = Math.sign(amountToAllocate) === Math.sign(billOutstanding);
      const autoAmount = sameSign ? Math.smallerInAbs(amountToAllocate, billOutstanding) : 0;
      if (Math.abs(pb.amount) > Math.abs(billOutstanding)) pb.amount = autoAmount;
      if (!pb.amount) pb.amount = autoAmount; // we dont override amounts that are specified
      amountToAllocate -= pb.amount;
      if (amountToAllocate === 0) break;
    }
    const lang = this.community().settings.language;
    const payAccountCategory = Accounts.getByCode(this.payAccount, this.communityId)?.category;
    if (amountToAllocate && equalWithinUnit(0, amountToAllocate, lang, payAccountCategory)) {
      this.rounding = amountToAllocate;
      amountToAllocate -= this.rounding;
    } else if (this.rounding) this.rounding = 0;
    for (const line of this.getLines()) {
      if (!line) continue; // can be null, when a line is deleted from the array
      if (line.amount && line.amount < amountToAllocate) {
        amountToAllocate -= line.amount;
        continue;
      } else if (line.amount > amountToAllocate) {
        line.amount = amountToAllocate;
        amountToAllocate = 0;
        break;
      }
    }
    this.outstanding = this.calculateOutstanding();
  },
  fillFromStatementEntry(entry) {
    this.amount = entry.unreconciledAmount() * this.relationSign();
    this.payAccount = entry.account;
    if (!this.bills && !this.lines && !_.contains(this.community().settings.paymentsToBills, this.relation)) this.lines = [{ amount: this.amount }];
  },
  makeJournalEntries(accountingMethod) {
    this.debit = [];
    this.credit = [];
    const round = this.currencyRoundingFunction();
    let unallocatedAmount = round(this.amountWoRounding());
    const subTxEntry = (accountingMethod === 'cash') ? { subTx: 1 } : {};
    if (this.subType() !== 'remission') {
      const payEntry = { amount: this.amount, account: this.payAccount, partner: this.partnerContractCode(), localizer: undefined, parcelId: undefined };
      this.makeEntry(this.relationSide(), payEntry); // `38
    }
    for (const billPaid of this.getBills()) {
      if (unallocatedAmount === 0) break;
      const bill = Transactions.findOne(billPaid.id);
      debugAssert(billPaid.amount < 0 === bill.amount < 0, 'Bill amount and its payment must have the same sign');
      const makeEntries = function makeEntries(line, amount) {
        const relationAccount = bill.lineRelationAccount(line);
        const newEntry = { amount, partner: this.partnerContractCode(), localizer: line.localizer, parcelId: line.parcelId };
        if (this.subType() !== 'remission') {  // 'payment' or 'identification'
          if (accountingMethod === 'accrual') {
            this.makeEntry(this.conteerSide(), _.extend({ account: relationAccount }, newEntry)); // `331
          } else if (accountingMethod === 'cash') {
            this.makeEntry(this.conteerSide(), _.extend({ account: line.account }, newEntry));  // `95
            const technicalAccount = Accounts.toTechnicalCode(line.account);
            this.makeEntry(this.relationSide(), _.extend({ account: technicalAccount }, _.extend({}, newEntry, subTxEntry))); // `095
            const technicalRelationAccount = Accounts.toTechnicalCode(relationAccount);
            this.makeEntry(this.conteerSide(), _.extend({ account: technicalRelationAccount }, _.extend({}, newEntry, subTxEntry))); // `0331
          }
        } else if (this.subType() === 'remission') {
          let undoLineAccount = line.account;
          let undoRelationAccount = relationAccount;
          if (accountingMethod === 'cash') {
            undoLineAccount = Accounts.toTechnicalCode(undoLineAccount);
            undoRelationAccount = Accounts.toTechnicalCode(undoRelationAccount);
          }
          this.makeEntry(this.relationSide(), _.extend({ account: undoLineAccount }, newEntry)); // `95 or `095
          this.makeEntry(this.conteerSide(), _.extend({ account: undoRelationAccount }, newEntry)); // `331 or `0331
        }
      };

      if (billPaid.amount === bill.amount) {
        for (const line of bill.getLines()) {
          if (unallocatedAmount === 0) break;
          const amount = line.amount;
          makeEntries.call(this, line, amount);
          unallocatedAmount -= amount;
        }
      } else if (Math.abs(billPaid.amount) < Math.abs(bill.amount)) {
        let paidBefore = 0;
        for (const payment of bill.payments) {
          if (payment.id === this._id) break;
          else paidBefore += payment.amount;
        }
        let unallocatedFromBill = billPaid.amount;
        const billLines = bill.getLines().oppositeSignsFirst(bill.amount, 'amount');
        for (const line of billLines) {
          if (unallocatedAmount === 0) break;
          if (paidBefore === 0) {
            let amount;
            if (bill.amount >= 0) amount = line.amount >= 0 ? Math.min(line.amount, unallocatedAmount, unallocatedFromBill) : line.amount;
            if (bill.amount < 0) amount = line.amount < 0 ? Math.max(line.amount, unallocatedAmount, unallocatedFromBill) : line.amount;
            makeEntries.call(this, line, amount);
            unallocatedAmount -= amount;
            unallocatedFromBill -= amount;
          } else if ((bill.amount >= 0 && paidBefore > 0) || (bill.amount < 0 && paidBefore < 0)) {
            paidBefore -= line.amount;
          }
          if ((bill.amount >= 0 && paidBefore < 0) || (bill.amount < 0 && paidBefore > 0)) {
            const remainder = -paidBefore;
            paidBefore = 0;
            let amount;
            if (bill.amount >= 0) amount = Math.min(remainder, unallocatedAmount, unallocatedFromBill);
            if (bill.amount < 0) amount = Math.max(remainder, unallocatedAmount, unallocatedFromBill);
            makeEntries.call(this, line, amount);
            unallocatedAmount -= amount;
            unallocatedFromBill -= amount;
          }
        }
      } else productionAssert(false, "payed amount for a bill can not be more than bill's amount");
    }
    for (const line of this.getLines()) {
      if (unallocatedAmount === 0) break;
      debugAssert(unallocatedAmount < 0 === line.amount < 0, 'All lines must have the same sign');
      const newEntry = { amount: line.amount, partner: this.partnerContractCode(), localizer: line.localizer, parcelId: line.parcelId };
      this.makeEntry(this.conteerSide(), _.extend({ account: line.account }, newEntry));
      if (accountingMethod === 'cash') {
        const technicalAccount = Accounts.toTechnicalCode(line.account);
        const billDef = this.correspondingBillTxdef();
        let relationAccount = _.first(billDef[this.relationSide()]);
        let digit;
        billDef[this.conteerSide()].forEach(code => {
          if (line.account.startsWith(code)) {
            digit = line.account.replace(code, '');
          }
        });
        relationAccount += digit;
        const technicalRelationAccount = Accounts.toTechnicalCode(relationAccount);
        this.makeEntry(this.relationSide(), _.extend({ account: technicalAccount }, _.extend({}, newEntry, subTxEntry)));
        this.makeEntry(this.conteerSide(), _.extend({ account: technicalRelationAccount }, _.extend({}, newEntry, subTxEntry)));
      }
      unallocatedAmount -= line.amount;
    }
    unallocatedAmount = round(unallocatedAmount);
    if (unallocatedAmount) { // still has remainder, that goes as unidentified
      const unidentifiedAccount = this.txdef().unidentifiedAccount();
      const newEntry = { account: unidentifiedAccount, amount: unallocatedAmount, partner: this.partnerContractCode(), localizer: undefined, parcelId: undefined };
      this.makeEntry(this.conteerSide(), newEntry);
    }
    if (this.rounding) this.makeEntry(this.conteerSide(), { amount: this.rounding, account: '`99' });
    const legs = { debit: this.debit, credit: this.credit };
    return legs;
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    let updated = false;
    if (this.payAccount?.startsWith(codeFrom)) {
      this.payAccount = this.payAccount.replace(codeFrom, codeTo);
      updated = true;
    }
    this.getLines().forEach(line => {
      if (line.account?.startsWith(codeFrom)) {
        line.account = line.account.replace(codeFrom, codeTo);
        updated = true;
      }
    });
    return updated;
  },
  registerOnBill(billPaid, direction = +1) {
    const bill = Transactions.findOne(billPaid.id);
    if (!bill) return; // When removing multiple transactions and bills are removed first, don't get stuck in after hook
    const paymentOnBill = _.extend({}, billPaid);
    paymentOnBill.id = this._id; // replacing the bill._id with the payment._id
    paymentOnBill.valueDate = this.valueDate;

    const oldPayments = bill.getPayments();
    const found = _.find(oldPayments, p => p.id === this._id);

    let newPayments;
    if (direction === +1) {
      if (found) {
        found.amount = paymentOnBill.amount;
        found.valueDate = paymentOnBill.valueDate;
        newPayments = oldPayments;
      } else newPayments = oldPayments.concat([paymentOnBill]);
    } else if (direction === -1) {
      if (found) {
        found.amount = 0;  // We do not remove the record, so that the records indexes remain stable
      }
      newPayments = oldPayments;
    }
    Transactions.update(bill._id,
      { $set: { payments: newPayments } }, // We look for $set.payments in the hooks, so cannot use $push here
      { selector: { category: 'bill' } },
    );
  },
  displayInSelect() {
    return `${this.serialId} (${moment(this.valueDate).format('YYYY.MM.DD')} ${this.partner()} ${this.amount})`;
  },
  displayInHistory() {
    const generic = Transactions._helpers.prototype.displayInHistory.call(this);
    return generic + (this.bills?.length ? ` (${this.bills.length} ${__('bill')})` : '');
  },
});

Transactions.attachVariantSchema(paymentSchema, { selector: { category: 'payment' } });

Transactions.simpleSchema({ category: 'payment' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'payment' }).i18n('schemaPayments');

// --- Factory ---

Factory.define('payment', Transactions, {
  category: 'payment',
//  billId: () => Factory.get('bill'),
  relation: 'supplier',
//  partnerId: () => Factory.get('supplier'),
//  contractId: () => Factory.get('contract'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
  payAccount: '`381',
});
