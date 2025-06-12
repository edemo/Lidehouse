import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels, chooseLocalizer } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Relations } from '/imports/api/core/relations.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

export const DEFAULT_INTEREST = 10;

export const Bills = {};

export const choosePayment = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const payments = Transactions.find({ communityId, category: 'payment', outstanding: { $ne: 0 } });
    const options = payments.map(function option(payment) {
      return { label: `${payment.partner()} ${moment(payment.valueDate).format('L')} ${payment.amount} ${payment.note || ''}`, value: payment._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

const readingSchema = new SimpleSchema({
  date: { type: Date },
  value: { type: Number, decimal: true },
});

const meteringSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id },
  start: { type: readingSchema },
  end: { type: readingSchema },
});

const billingSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id },
  period: { type: String, optional: true },
});

const lateFeeBillingSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id }, // id of late Bill
  value: { type: Number, decimal: true, optional: true }, // lateValue billed for Bill
});

const lineSchema = {
  title: { type: String },
  details: { type: String, optional: true },
  uom: { type: String, optional: true },  // unit of measurment
  quantity: { type: Number, decimal: true, autoform: { defaultValue: 1 } },
  unitPrice: { type: Number, decimal: true },
  discoPct: { type: Number, decimal: true, optional: true },
  disco: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  taxPct: { type: Number, decimal: true, optional: true, defaultValue: 0 },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  // autoValue() {
  //  return this.siblingField('quantity').value * this.siblingField('unitPrice').value;
  //} },
  billing: { type: billingSchema, optional: true, autoform: { type: 'hidden' } },
  metering: { type: meteringSchema, optional: true, autoform: { type: 'hidden' } },
  lateFeeBilling: { type: lateFeeBillingSchema, optional: true, autoform: { type: 'hidden' } },
  account: { type: String, optional: true, autoform: chooseConteerAccount() },
  localizer: { type: String, optional: true, autoform: chooseLocalizer() },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
};
_.each(lineSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Bills.lineSchema = new SimpleSchema(lineSchema);

/*
const simpleLineSchema = {
  title: { type: String },
  amount: { type: Number, decimal: true },
  account: { type: String, optional: true, autoform: chooseConteerAccount() },
  localizer: { type: String, optional: true, autoform: chooseLocalizer() },
};
*/

Bills.receiptSchema = new SimpleSchema({
  // amount overrides non-optional value of transactions, with optional & calculated value
  amount: { type: Number, decimal: true, optional: true },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  disco: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
//  simple: { type: simpleLineSchema, optional: true }, // used if there is only one simplified line
  lines: { type: Array, optional: true },             // used if there multiple complex line
  'lines.$': { type: Bills.lineSchema },
});

Bills.paymentSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePayment } },
  amount: { type: Number, decimal: true },
  valueDate: { type: Date, optional: true }, // can be missing for deleted payment (then it has original id, and 0 amount)
});

Bills.extensionSchema = new SimpleSchema([
  Transactions.partnerSchema,
  Bills.receiptSchema, {
    valueDate: { type: Date, autoValue() { return this.field('deliveryDate').value; } },
    issueDate: { type: Date },
    deliveryDate: { type: Date },
    dueDate: { type: Date },
    paymentMethod: { type: String, optional: true, allowedValues: ['cash', 'bank'] },
    relationAccount: { type: String, optional: true, autoform: _.extend(chooseConteerAccount(true), { readonly: true }) },
    payments: { type: [Bills.paymentSchema], defaultValue: [] },
    outstanding: { type: Number, decimal: true, optional: true },
  //  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
    lateValueBilled: { type: Number, decimal: true, optional: true },   // Lateness of payment measured in (amount * days)
    lateValueOutstanding: { type: Number, decimal: true, optional: true },  // Only updated when payments are made, so not neccesarily up-to-date
  },
]);

Bills.modifiableFields = ['amount', 'issueDate', 'valueDate', 'dueDate', 'partnerId', 'contractId'];

Meteor.startup(function indexBills() {
  if (Meteor.isClient && MinimongoIndexing) {
  } else if (Meteor.isServer) {
    Transactions._ensureIndex({ communityId: 1, relation: 1, outstanding: -1 });
    Transactions._ensureIndex({ communityId: 1, relation: 1, lateValueOutstanding: -1 }, { sparse: true });
  }
});

export const BillAndReceiptHelpers = {
  getLines() {
    return (this.lines || []).filter(l => l); // nulls can be in the array, on the UI, when lines are deleted
  },
  isSimple() {
    return !this.lines?.length ||
      (this.lines?.length === 1 && this.lines[0].quantity === 1 && !this.lines[0].details && !this.lines[0].taxPct && !this.lines[0].dicsoPct);
  },
  issuer() {
    if (this.relation === 'supplier') return { partner: this.partner(), contract: this.contract() };
    return this.community().asPartner();
  },
  receiver() {
    if (this.relation === 'customer' || this.relation === 'member') return { partner: this.partner(), contract: this.contract() };
    return this.community().asPartner();
  },
  lineCount() {
    return this.lines?.length;
  },
  matchingTxSide() {
    if (this.relation === 'supplier') return 'debit';
    else if (this.relation === 'customer' || this.relation === 'member') return 'credit';
    debugAssert(false, 'unknown relation');
    return undefined;
  },
  otherTxSide() {
    return Transactions.oppositeSide(this.matchingTxSide());
  },
  validateForPost() {
    if (!this.hasConteerData()) throw new Meteor.Error('err_notAllowed', 'Transaction has to be account assigned first');
  },
  autoFill() {
    if (!this.lines) return;  // when the modifier doesn't touch the lines, should not autoFill
    let totalAmount = 0;
    let totalTax = 0;
    let totalDisco = 0;
    const round = this.currencyRoundingFunction();
    this.getLines().forEach(line => {
      line.amount = round(line.unitPrice * line.quantity);
      if (line.discoPct) {
        line.disco = round((line.amount * line.discoPct) / 100);
        line.amount -= line.disco;
        totalDisco += line.disco;
      }
      if (line.taxPct) {
        line.tax = round((line.amount * line.taxPct) / 100);
        line.amount += line.tax;
        totalTax += line.tax;
      }
      totalAmount += line.amount;
    });
    if (this.rounding) totalAmount += this.rounding;
    this.amount = round(totalAmount);
    this.tax = totalTax;
    this.disco = totalDisco;
  },
};

Transactions.categoryHelpers('bill', {
  ...BillAndReceiptHelpers,
  getPayments() {
    return (this.payments || []);
  },
  getPaymentTransactions() {
    return this.getPayments().map(payment => Transactions.findOne(payment.id)).filter(p => p);
  },
  paymentCount() {
    return this.getPayments().length;
  },
  hasPayments() {
    return this.getPayments().reduce((sum, p) => sum + p.amount, 0);
  },
  hadPayments() {
    return this.getPayments().find(p => p.amount);  // Zero amount payments, are removed payments
  },
  paymentDate() {
    const payment = _.last(this.getPayments());
    return payment?.valueDate;
  },
  net() {
    return this.amount - this.tax;
  },
  lineRelationAccount(line) {
    if (line.relationAccount) return line.relationAccount;
    let account = this.relationAccount;
    if (line.billing) {
      const billing = ParcelBillings.findOne(line.billing.id);
      productionAssert(billing, 'Unable to find the billing which created this bill line', { bill: this, line });
      account += billing.digit;
    } else if (this.relation === 'member' && line.account && this.defId) {
      let digit = '';
      this.txdef()[this.conteerSide()].forEach(code => {
        if (line.account.startsWith(code)) {
          digit = line.account.replace(code, '');
        }
      });
      account += digit;
    }
    return account;
  },
  fillFromStatementEntry(entry) {
    this.amount = entry.amount * this.relationSign();
    this.issueDate = entry.valueDate;
    this.deliveryDate = entry.valueDate;
    this.dueDate = entry.valueDate;
    if (!this.lines) {
      const title =  entry.note || __(this.txdef().name);
      this.lines = [{ title, quantity: 1, unitPrice: Math.abs(entry.amount) }];
    }
  },
  correspondingPaymentTxdef() {
    return Txdefs.findOneT({ communityId: this.communityId, category: 'payment', 'data.relation': this.relation, 'data.paymentSubType': 'payment' });
  },
  correspondingIdentificationTxdef() {
    return Txdefs.findOneT({ communityId: this.communityId, category: 'payment', 'data.relation': this.relation, 'data.paymentSubType': 'identification' });
  },
  correspondingRemissionTxdef() {
    return Txdefs.findOneT({ communityId: this.communityId, category: 'payment', 'data.relation': this.relation, 'data.paymentSubType': 'remission' });
  },
  makeJournalEntries(accountingMethod) {
    this.debit = [];
    this.credit = [];
    this.getLines().forEach(line => {
      const newEntry = { amount: line.amount, partner: this.partnerContractCode(), localizer: line.localizer, parcelId: line.parcelId };
      let lineAccount = line.account;
      let lineRelationAccount = this.lineRelationAccount(line);
      if (accountingMethod === 'cash') {
        lineAccount = Accounts.toTechnicalCode(lineAccount);
        lineRelationAccount = Accounts.toTechnicalCode(lineRelationAccount);
      } else debugAssert(accountingMethod === 'accrual');
      this.makeEntry(this.conteerSide(), _.extend({ account: lineAccount }, newEntry));
      this.makeEntry(this.relationSide(), _.extend({ account: lineRelationAccount }, newEntry));
    });
    return { debit: this.debit, credit: this.credit };
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    let updated = false;
    if (this.relationAccount?.startsWith(codeFrom)) {
      this.relationAccount = this.relationAccount.replace(codeFrom, codeTo);
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
  hasConteerData() {
    let result = true;
    this.getLines().forEach(line => { if (line) {
      if (!line.account || (!line.relationAccount && !this.relationAccount)) result = false;
    } });
    return result;
  },
  calculateOutstanding() {
    if (this.status === 'void') return 0;
    let paid = 0;
    this.getPayments().forEach(p => paid += p.amount);
    return this.amount - paid;
  },
  displayInSelect() {
    return `${this.serialId} (${this.partner()} ${Date.formatUTC(this.valueDate, 'YYYY.MM.DD')} ${this.outstanding}/${this.amount})`;
  },
  displayInHistory() {
    const generic = Transactions._helpers.prototype.displayInHistory.call(this);
    return generic + (this.lineCount() ? ` (${this.lineCount()} ${__('item')})` : '');
  },
  overdueDays() {
    const diff = moment().diff(this.dueDate, 'days');
    if (diff < 0) return 0;
    return diff;
  },
  availableAmountFromOverPayment() {
    let result = 0;
    const contract = this.contract();
    const def = this.correspondingIdentificationTxdef();
    if (contract) {
      def[def.relationSide()].forEach(account => {
        result += this.contract().outstanding(account);
      });
    }
    result *= (-1); // Outstanding means underpayment, so Overpayment is the opposite of it
    return result;
  },
  currentLateness(currentDate = moment.utc().toDate()) {
    const lateDays = moment.utc(currentDate).diff(this.dueDate, 'days');
    if (lateDays <= 0) return { lateValue: 0, lateValueBilled: this.lateValueBilled || 0, details: '' };
    let lateValue = 0;
    let lateValueBilled = 0;
    let details = __('lateFeeBillDetails', { serialId: this.serialId }) + ' ';
    let outstanding = this.outstanding;
    this.getPayments().forEach((payment) => {
      const paymentLateDays =  moment.utc(payment.valueDate).diff(this.dueDate, 'days');
      if (currentDate >= payment.valueDate) {
        if (paymentLateDays >= 0) {
          lateValue += paymentLateDays * payment.amount;
          details += __('lateFeeDetails', { amount: payment.amount, lateDays: paymentLateDays, yearAdjusted: (payment.amount * paymentLateDays / 365).round(2) });
        }
      } else {
        outstanding += payment.amount;
      }
    });
    if (outstanding > 0) {
      if (lateDays > 0) {
        lateValue += lateDays * outstanding;
        details += __('lateFeeDetails', { amount: outstanding, lateDays, yearAdjusted: (outstanding * lateDays / 365).round(2) });
      }   
    }
    if (this.lateValueBilled > 0) {
      lateValueBilled = this.lateValueBilled;
      details += ' ' + __('lateFeeBilledtDetails', { yearAdjusted: (this.lateValueBilled / 365).round(2) });
    }
    return { lateValue, lateValueBilled, details };
  },
  calculateLateValueOutstanding(date = moment.utc().toDate()) {
//    if (!this.community().settings.latePaymentFees) return undefined;
//    if (this.outstanding === 0) debugAssert('Should not call late value calculation on a bill where all lateValue have been already billed.');
    const lateness = this.currentLateness(date);
    return lateness.lateValue - lateness.lateValueBilled;
//    if (result === 0 && !this.outstanding) return null;  // null means its 0 and will never be positive again (all lateness is billed already, sp the passing of time does not change the lateValue)
  },
  hasPotentialLateValueOutstanding() { // return a boolean, but does not calculate how much - for that calculateLateValueOutstanding() should be called
    return !!((this.dueDate < moment.utc().toDate())); // && (this.lateValueOutstanding > this.lateValueBilled) || ( (this.outstanding * 30 > this.lateValueBilled)));
  },
  createLateFeeBill() {
    return {
      category: 'bill',
      defId: this.defId,
      valueDate: moment.utc().toDate(),
      relation: this.relation,
      partnerId: this.partnerId,
      contractId: this.contractId,
      relationAccount: this.relationAccount,
      lines: [],
    }
  },
  createLateFeeLine(date = Date.now(), parcelBilling = ParcelBillings.findOneActive({ 'projection.base': 'YAL' })) {
    const account = Accounts.getByName('Late payment income', this.communityId).code;
    const interest = parcelBilling ? parcelBilling.projection.unitPrice : DEFAULT_INTEREST;
    const lateness = this.currentLateness(date);
    const lateValueBilledNow = lateness.lateValue - (this.lateValueBilled || 0);
    const lateValueYA = (lateValueBilledNow / 365 / 100).round(2);  // Year Adjusted

    return {
      title: __('Late payment fees') + ' ' + this.serialId,
      details: lateness.details,
      quantity: lateValueYA,
      uom: parcelBilling?.projectionUom() || '%',
      unitPrice: interest,
      amount: lateValueYA * interest,
      account,
      lateFeeBilling: {
        id: this._id,
        value: lateValueBilledNow,
      },
    }
  },
});

Transactions.attachVariantSchema(Bills.extensionSchema, { selector: { category: 'bill' } });

Transactions.simpleSchema({ category: 'bill' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'bill' }).i18n('schemaBills');

// --- Factory ---

Factory.define('bill', Transactions, {
  category: 'bill',
  relation: 'supplier',
  partnerId: () => Factory.get('supplier'),
  issueDate: () => Clock.currentDate(),
  deliveryDate: () => Clock.currentDate(),
  dueDate: () => Clock.currentDate(),
  lines: () => [{
    title: faker.random.word(),
    uom: 'piece',
    quantity: 1,
    unitPrice: faker.random.number(10000),
    account: '`861',
    localizer: '@',
  }],
});

export const chooseBill = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const bills = Transactions.find({ communityId, category: 'bill', outstanding: { $ne: 0 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};
