/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { Partners } from '../partners/partners';

if (Meteor.isServer) {
  let FixtureA; // Fixture with accrual accouting

  describe('transactions', function () {
    this.timeout(350000);
    before(function () {
      FixtureA = freshFixture();
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.language': 'hu' } });  // smallest coin is the 5
      // Need to apply, so the member contracts get created
      FixtureA.builder.execute(ParcelBillings.methods.apply, { communityId: FixtureA.demoCommunityId, ids: [FixtureA.parcelBilling], date: new Date() });
    });
    after(function () {
    });

    describe('Bills outstanding lifecycle', function () {
      let billId;
      let bill;
      let paymentId;
      let payment;
      let paymentDate;
      let storno;
      let parcel1;
      let parcel2;
      before(function () {
        parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP01' });
        parcel2 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP02' });
        const partnerId = FixtureA.partnerId(FixtureA.dummyUsers[3]);
        const todayMoment = moment.utc().startOf('day');
        billId = FixtureA.builder.create('bill', {
          relation: 'member',
          partnerId,
          contractId: Contracts.findOne({ partnerId })._id,
          relationAccount: '`33',
          issueDate: todayMoment.toDate(),
          deliveryDate: todayMoment.subtract(1, 'weeks').toDate(),
          dueDate: todayMoment.add(1, 'weeks').toDate(),
          lines: [{
            title: 'Work 1',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`951',
            localizer: parcel1.code,
            parcelId: FixtureA.dummyParcels[1],
          }, {
            title: 'Work 2',
            uom: 'month',
            quantity: 2,
            unitPrice: 500,
            account: '`951',
            localizer: parcel2.code,
            parcelId: FixtureA.dummyParcels[2],
          }],
        });
      });
      after(function () {
        Transactions.remove(billId);
        Transactions.remove(paymentId);
      });

      it('AutoFills bill values correctly', function () {
        bill = Transactions.findOne(billId);

        chai.assert.equal(bill.lines.length, 2);
        chai.assert.equal(bill.lines[0].amount, 300);
        chai.assert.equal(bill.lines[1].amount, 1000);
        chai.assert.equal(bill.amount, 1300);
        chai.assert.equal(bill.valueDate.getTime(), bill.deliveryDate.getTime());
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);
        chai.assert.equal(bill.outstanding, 1300);
      });

      it('AutoAllocates payment correctly - without rounding (Bank payAccount)', function () {
        bill = Transactions.findOne(billId);
        const memberPaymentDef = bill.correspondingPaymentTxdef();
        const bankAccount = Accounts.findOneT({ communityId: FixtureA.demoCommunityId, category: 'bank' });
        paymentDate = moment.utc(bill.dueDate).add(10, 'days').toDate();
        payment = FixtureA.builder.build('payment', {
          defId: memberPaymentDef._id,
          relation: bill.relation,
          partnerId: bill.partnerId,
          contractId: bill.contractId,
          valueDate: paymentDate,
          amount: bill.amount + 2,
          payAccount: bankAccount.code,
          bills: [{
            id: billId,
            amount: 0,  // will be auto allocated to the full amount
          }],
        });
        payment = Transactions._transform(payment);
        payment.autoAllocate();

        chai.assert.equal(payment.bills.length, 1);
        chai.assert.equal(payment.bills[0].id, billId);
        chai.assert.equal(payment.bills[0].amount, bill.amount);
        chai.assert.equal(payment.lines, undefined);
        chai.assert.equal(payment.outstanding, 2);
        chai.assert.isUndefined(payment.rounding);

        paymentId = FixtureA.builder.execute(Transactions.methods.insert, payment);
      });

      it('Links payment to bill correctly', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.deepEqual(bill.payments[0], { id: paymentId, amount: bill.amount, valueDate: payment.valueDate });
        chai.assert.equal(bill.isPosted(), false);
        chai.assert.equal(bill.outstanding, 0);
      });

      it('Calculates lateness on paid bill correctly', function () {
        chai.assert.equal(bill.lateValueBilled, undefined);
        chai.assert.equal(bill.currentLateness(bill.deliveryDate).lateValue, 0);
        chai.assert.equal(bill.currentLateness(bill.dueDate).lateValue, 0);
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 10 * bill.amount);
        const laterDate = moment.utc(paymentDate).add(44, 'days').toDate();
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 10 * bill.amount);  // same, because it is fully paid already
        chai.assert.equal(bill.lateValueOutstanding, 0); // Date.now() is before the due date
      });

      it('Cannot remove a draft bill, while it links to a payment', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.remove, { _id: billId });
        }, 'err_unableToRemove');
      });

      it('Can modify a draft bill and a draft payment', function () {
        const contractId = bill.contractId;
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { contractId: null },
        } });
        bill = Transactions.findOne(billId);
        chai.assert.isNull(bill.contractId);

        FixtureA.builder.execute(Transactions.methods.update, { _id: paymentId, modifier: {
          $set: { contractId: null },
        } });
        payment = Transactions.findOne(paymentId);
        chai.assert.isNull(payment.contractId);

        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { contractId },
        } });
        FixtureA.builder.execute(Transactions.methods.update, { _id: paymentId, modifier: {
          $set: { contractId },
        } });
      });

      it('Can remove a draft payment, and it delinks it from bill', function () {
        FixtureA.builder.execute(Transactions.methods.remove, { _id: paymentId });
        payment = Transactions.findOne(paymentId);
        chai.assert.isUndefined(payment);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.deepEqual(bill.payments[0], { id: paymentId, amount: 0, valueDate: paymentDate });
        chai.assert.equal(bill.outstanding, 1300);
      });

      it('Calculates lateness on voided payment bill correctly', function () {
        chai.assert.equal(bill.lateValueBilled, undefined);
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 10 * bill.amount);
        const laterDate = moment.utc(bill.dueDate).add(44, 'days').toDate();
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 44 * bill.amount);  // increases, because it is not paid
        chai.assert.equal(bill.lateValueOutstanding, 0);  // Date.now() is before the due date
      });
  
      it('Can remove a draft bill, when it does not link to any payments', function () {
        bill = Transactions.findOne(billId);
        const billClone = _.extend({}, bill);
        FixtureA.builder.execute(Transactions.methods.remove, { _id: billId });
        bill = Transactions.findOne(billId);
        chai.assert.isUndefined(bill);

        billId = FixtureA.builder.execute(Transactions.methods.insert, billClone);
      });

      it('AutoAllocates payment correctly - with rounding (Cash payAccount)', function () {
        bill = Transactions.findOne(billId);
        const memberPaymentDef = bill.correspondingPaymentTxdef();
        const cashAccount = Accounts.findOneT({ communityId: FixtureA.demoCommunityId, category: 'cash' });
        paymentDate = moment(bill.dueDate).add(20, 'days').toDate();
        payment = FixtureA.builder.build('payment', {
          defId: memberPaymentDef._id,
          relation: bill.relation,
          partnerId: bill.partnerId,
          contractId: bill.contractId,
          valueDate: paymentDate,
          amount: bill.amount + 2,
          payAccount: cashAccount.code,
          bills: [{
            id: billId,
            amount: 0,  // will be auto allocated to the full amount
          }],
        });
        payment = Transactions._transform(payment);
        payment.autoAllocate();

        chai.assert.equal(payment.bills.length, 1);
        chai.assert.equal(payment.bills[0].id, billId);
        chai.assert.equal(payment.bills[0].amount, bill.amount);
        chai.assert.isUndefined(payment.lines);
        chai.assert.equal(payment.rounding, 2);

        paymentId = FixtureA.builder.execute(Transactions.methods.insert, payment);
      });

      it('Links second payment to bill correctly', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.payments[0].amount, 0);
        chai.assert.deepEqual(bill.payments[1], { id: paymentId, amount: bill.amount, valueDate: payment.valueDate });
        chai.assert.equal(bill.isPosted(), false);
        chai.assert.equal(bill.outstanding, 0);
      });

      it('Calculates lateness on second paid bill correctly', function () {
        chai.assert.equal(bill.lateValueBilled, undefined);
        chai.assert.equal(bill.currentLateness(bill.deliveryDate).lateValue, 0);
        chai.assert.equal(bill.currentLateness(bill.dueDate).lateValue, 0);
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 20 * bill.amount);
        const laterDate = moment.utc(paymentDate).add(44, 'days').toDate();
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 20 * bill.amount);  // same, because it is fully paid already
        chai.assert.equal(bill.lateValueOutstanding, 0); // Date.now() is before the due date
      });

      it('Bill updates partner balances correctly', function () {
        // Before posting, the balances are not yet effected
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'customer'), 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 0);
        chai.assert.equal(bill.contract().outstanding(), 0);
        chai.assert.equal(parcel1.balance(), 0);
        chai.assert.equal(parcel2.balance(), 0);
        chai.assert.equal(parcel1.outstanding(), 0);
        chai.assert.equal(parcel2.outstanding(), 0);

        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.contract().balance(), -1300);
        chai.assert.equal(bill.partner().outstanding(undefined, 'customer'), 1300);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), -1300);
        chai.assert.equal(bill.contract().outstanding(), 1300);
        chai.assert.equal(parcel1.balance(), -300);
        chai.assert.equal(parcel2.balance(), -1000);
        chai.assert.equal(parcel1.outstanding(), 300);
        chai.assert.equal(parcel2.outstanding(), 1000);
      });

      it('Cannot modify a petrified bill', function () {
        const todayMoment = moment.utc().startOf('day');
        const oldDate = todayMoment.subtract(2, 'years').toDate();
        const oldBillId = FixtureA.builder.create('bill', {
          issueDate: oldDate,
          deliveryDate: oldDate,
          dueDate: oldDate,
          relationAccount: '`454' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: oldBillId });
        chai.assert.equal(moment(Transactions.findOne(oldBillId).valueDate).year(), moment(oldDate).year());
        FixtureA.builder.execute(AccountingPeriods.methods.close, { communityId: FixtureA.demoCommunityId, tag: 'T-' + oldDate.getFullYear() });
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: oldBillId, modifier: {
            $set: { contractId: null },
          } });
        }, 'err_permissionDenied');
        AccountingPeriods.update({ communityId: FixtureA.demoCommunityId }, { $unset: { accountingClosedAt: '' } });
        FixtureA.builder.execute(Transactions.methods.remove, { _id: oldBillId });
      });

      xit('Cannot modify a bill that has payments', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
            $set: { 'lines.0.unitPrice': 500, 'lines.0.amount': 500, amount: 1500 },
          } });
        }, 'err_permissionDenied');
      });

      it('Modifying posted bill updates partner balances correctly', function () {
        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.partner().outstanding(undefined, 'customer'), 1300);
        chai.assert.equal(bill.contract().outstanding(), 1300);
        chai.assert.equal(parcel1.balance(), -300);
        chai.assert.equal(parcel2.balance(), -1000);
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { 'lines.0.unitPrice': 500, 'lines.0.amount': 500, amount: 1500 },
        } });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.partner().balance(), -1500);
        chai.assert.equal(bill.contract().balance(), -1500);
        chai.assert.equal(bill.partner().outstanding(undefined, 'customer'), 1500);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), -1500);
        chai.assert.equal(bill.contract().outstanding(), 1500);
        chai.assert.equal(parcel1.balance(), -500);
        chai.assert.equal(parcel2.balance(), -1000);
        chai.assert.equal(parcel1.outstanding(), 500);
        chai.assert.equal(parcel2.outstanding(), 1000);
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { 'lines.0.unitPrice': 300, 'lines.0.amount': 300, amount: 1300 },
        } });
      });

      it('Payment updates partner balances correctly', function () {
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });

        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'customer'), 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 0);
        chai.assert.equal(bill.contract().outstanding(), 0);
        chai.assert.equal(parcel1.balance(), 0);
        chai.assert.equal(parcel2.balance(), 0);
        chai.assert.equal(parcel1.outstanding(), 0);
        chai.assert.equal(parcel2.outstanding(), 0);
      });

      it("Modifying a posted bill with payments modifies payment's journal entries as well", function () {
        bill = Transactions.findOne(billId);
        const lines = bill.getLines();
        lines[0].unitPrice = 500;
        lines[0].account = '`9521';
        lines[0].amount = 500;
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { lines, amount: 1500 } } });
        bill = Transactions.findOne(billId);
        payment = Transactions.findOne(paymentId);

        chai.assert.equal(bill.amount, 1500);
        chai.assert.deepEqual(bill.payments[1], { id: paymentId, amount: 1300, valueDate: paymentDate });
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(payment.amount, 1302);
        chai.assert.equal(payment.outstanding, 0);
        const credit = [{ account: '`3321', amount: 500, partner: bill.partnerContractCode(), localizer: parcel1.code, parcelId: FixtureA.dummyParcels[1] },
          { account: '`331', amount: 800, partner: bill.partnerContractCode(), localizer: parcel2.code, parcelId: FixtureA.dummyParcels[2] },
          { amount: 2, account: '`99' }];
        chai.assert.deepEqual(payment.credit, credit);
        chai.assert.deepEqual(payment.debit, [{ amount: 1302, account: '`381' }]);

        lines[0].unitPrice = 100;
        lines[0].account = '`951';
        lines[0].amount = 100;
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
            $set: { lines, amount: 1100 },
          } });
        }, "payed amount for a bill can not be more than bill's amount");

        lines[0].unitPrice = 300;
        lines[0].account = '`951';
        lines[0].amount = 300;
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
          $set: { lines, amount: 1300 },
        } });
      });

      it('Disconnecting/reconnecting posted payment from bill updates balances and lateness correctly', function () {
        FixtureA.builder.execute(Transactions.methods.update, { _id: paymentId, modifier: {
          $set: { lines: [{ account: '`3321', amount: payment.amount - 2 }], bills: [] },
        } });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.outstanding, 1300);
        chai.assert.equal(parcel1.balance(), -300);
        chai.assert.equal(parcel2.balance(), -1000);
        chai.assert.equal(parcel1.outstanding(), 300);
        chai.assert.equal(parcel2.outstanding(), 1000);
        //lateness
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 20 * bill.amount);
        const laterDate = moment.utc(bill.dueDate).add(44, 'days').toDate();
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 44 * bill.amount);  // increases, because it is not paid

        FixtureA.builder.execute(Transactions.methods.update, { _id: paymentId, modifier: {
          $set: { lines: [], bills: [{ id: billId, amount: bill.amount }] },
        } });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.contract().outstanding(), 0);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(parcel1.balance(), 0);
        chai.assert.equal(parcel2.balance(), 0);
        chai.assert.equal(parcel1.outstanding(), 0);
        chai.assert.equal(parcel2.outstanding(), 0);
        //lateness
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 20 * bill.amount);
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 20 * bill.amount);  // same, because it paid
      });

      it('Cannot modify a petrified payment', function () {
        const todayMoment = moment.utc().startOf('day');
        const oldDate = todayMoment.subtract(2, 'years').toDate();
        const oldPaymentId = FixtureA.builder.create('payment', {
          valueDate: oldDate,
          partnerId: FixtureA.supplier,
          contractId: FixtureA.supplierContract,
          lines: [{ account: '`861', amount: 500 }],
          amount: 500,
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: oldPaymentId });
        chai.assert.isDefined(Transactions.findOne(oldPaymentId));
        FixtureA.builder.execute(AccountingPeriods.methods.close, { communityId: FixtureA.demoCommunityId, tag: 'T-' + oldDate.getFullYear() });
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: oldPaymentId, modifier: {
            $set: { contractId: null },
          } });
        }, 'err_permissionDenied');
        AccountingPeriods.update({ communityId: FixtureA.demoCommunityId }, { $unset: { accountingClosedAt: '' } });
        FixtureA.builder.execute(Transactions.methods.remove, { _id: oldPaymentId });
      });

      it('Cannot storno a posted bill, while it links to a LIVE payment', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.remove, { _id: billId });
        }, 'err_unableToRemove');
      });

      it('Can storno a posted payment, and it delinks it from bill', function () {
        FixtureA.builder.execute(Transactions.methods.remove, { _id: paymentId });
        payment = Transactions.findOne(paymentId);
        chai.assert.isDefined(payment);
        chai.assert.equal(payment.status, 'void');
        chai.assert.equal(payment.amount, 1302);
        storno = Transactions.findOne({ serialId: payment.serialId + '/STORNO' });
        chai.assert.isDefined(storno);
        chai.assert.equal(storno.status, 'void');
        chai.assert.equal(storno.amount, -1302);

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.getPayments().length, 3);
        chai.assert.equal(bill.payments[0].amount, 0);
        chai.assert.equal(bill.payments[1].amount, 1300);
        chai.assert.equal(bill.payments[2].amount, -1300);
        chai.assert.equal(bill.outstanding, 1300);
        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.contract().balance(), -1300);
        //lateness
        chai.assert.equal(bill.currentLateness(paymentDate).lateValue, 20 * bill.amount);
        const laterDate = moment.utc(bill.dueDate).add(44, 'days').toDate();
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 44 * bill.amount);  // increases, because it is not paid        
      });

      it('Can storno a posted bill, when it does not link to any LIVE payments', function () {
        bill = Transactions.findOne(billId);
        const billClone = _.extend({}, bill);
        FixtureA.builder.execute(Transactions.methods.remove, { _id: billId });
        bill = Transactions.findOne(billId);
        chai.assert.isDefined(bill);
        chai.assert.equal(bill.status, 'void');
        chai.assert.equal(bill.amount, 1300);
        storno = Transactions.findOne({ serialId: bill.serialId + '/STORNO' });
        chai.assert.isDefined(storno);
        chai.assert.equal(storno.status, 'void');
        chai.assert.equal(storno.amount, -1300);
        chai.assert.equal(storno.outstanding, 0);

        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);

        billId = FixtureA.builder.execute(Transactions.methods.insert, billClone);
      });

      it('Cannot remove a storno for a bill or payment', function () {
        storno = Transactions.findOne({ serialId: bill.serialId + '/STORNO' });
        chai.assert.isDefined(storno);
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.remove, { _id: storno._id });
        }, 'err_permissionDenied');

        storno = Transactions.findOne({ serialId: payment.serialId + '/STORNO' });
        chai.assert.isDefined(storno);
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.remove, { _id: storno._id });
        }, 'err_permissionDenied');
      });

      xit('Can exchange balance between partners', function () { // moved exchange tests to separate describe
        const otherPartnerId = FixtureA.partnerId(FixtureA.dummyUsers[4]);
        const otherPartner = Partners.findOne(otherPartnerId);
        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.contract().balance(), -1300);
        chai.assert.equal(otherPartner.balance(), 0);

        const exchangeId = FixtureA.builder.create('transaction', {
          category: 'exchange',
          account: '`33',
          fromPartner: otherPartnerId,
          toPartner: bill.partnerId + '/' + bill.contractId,
          amount: 1000,
        });
        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.contract().balance(), -1300);
        chai.assert.equal(otherPartner.balance(), 0);

        FixtureA.builder.execute(Transactions.methods.post, { _id: exchangeId });
        chai.assert.equal(bill.partner().balance(), -300);
        chai.assert.equal(bill.contract().balance(), -300);
        chai.assert.equal(otherPartner.balance(), -1000);
      });
    });

    describe('Bills accounting lifecycle with Accrual method', function () {
      let billId;
      let bill;
      before(function () {
        const todayMoment = moment.utc().startOf('day');
        billId = FixtureA.builder.create('bill', {
          relation: 'supplier',
          partnerId: FixtureA.supplier,
          dueDate: todayMoment.subtract(25, 'days').toDate(),
          relationAccount: '`454',
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
          }],
        });
      });
      after(function () {
        Transactions.remove(billId);
      });

      it('Can create without accounts', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);

        chai.assert.equal(bill.outstanding, 300);
        chai.assert.isUndefined(bill.debit);
        chai.assert.isUndefined(bill.credit);
      });

      it('Can not post without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        }, 'err_notAllowed');
      });

      xit('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 300 }], amount: 300, valueDate: Clock.currentTime() });
        }, 'err_notAllowed');
      });

      it('Bill can be posted - it creates journal entries in accounting', function () {
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: { $set: { 'lines.0.account': '`861', 'lines.0.localizer': '@' } } });
        bill = Transactions.findOne(billId);
        chai.assert.isUndefined(bill.debit);
        chai.assert.isUndefined(bill.credit);

        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.isPosted(), true);
        const tx = Transactions.findOne(billId);
        chai.assert.isDefined(tx);
        chai.assert.equal(tx.category, 'bill');
        chai.assert.equal(tx.amount, 300);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '`861' }]);
        chai.assert.deepEqual(tx.credit, [{ amount: 300, account: '`454', localizer: '@', partner: bill.partnerContractCode() }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 300);
      });

      it('Member bill relation side is posted to relevant subaccount', function () {
        const todayMoment = moment.utc().startOf('day');
        const parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP01' });
        const partnerId = FixtureA.partnerId(FixtureA.dummyUsers[3]);
        const localizer = parcel1.code;
        const parcelId = FixtureA.dummyParcels[1];
        const contractId =  Contracts.findOne({ partnerId })._id;
        const memberBillId = FixtureA.builder.create('bill', {
          relation: 'member',
          partnerId,
          contractId,
          relationAccount: '`33',
          issueDate: todayMoment.toDate(),
          deliveryDate: todayMoment.subtract(1, 'weeks').toDate(),
          dueDate: todayMoment.add(1, 'weeks').toDate(),
          lines: [{
            title: 'Work 1',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`951',
            localizer,
            parcelId,
          }],
        });
        FixtureA.builder.execute(Transactions.methods.post, { _id: memberBillId });
        let tx = Transactions.findOne(memberBillId);
        const locationTags = { localizer, parcelId, partner: Partners.code(partnerId, contractId) };

        chai.assert.deepEqual(tx.credit, [{ amount: 300, account: '`951' }]);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '`331', ...locationTags }]);
        FixtureA.builder.execute(Transactions.methods.update, { _id: memberBillId, modifier: {
          $set: { 'lines.0.account': '`9522' },
        } });
        FixtureA.builder.execute(Transactions.methods.post, { _id: memberBillId });
        tx = Transactions.findOne(memberBillId);
        chai.assert.deepEqual(tx.credit, [{ amount: 300, account: '`9522' }]);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '`3322', ...locationTags }]);
      });

      it('Can register Payments', function () {
        const bankAccount = '`381';
        bill = Transactions.findOne(billId);
        const paymentDate1 = moment.utc(bill.dueDate).add(10, 'days').toDate();
        const betweenDate = moment.utc(bill.dueDate).add(15, 'days').toDate();
        const paymentDate2 = moment.utc(bill.dueDate).add(20, 'days').toDate();
        const laterDate = moment.utc(bill.dueDate).add(44, 'days').toDate();

        const paymentId1 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, partnerId: FixtureA.supplier, valueDate: paymentDate1, payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.outstanding, 200);
        // lateness
        chai.assert.equal(bill.currentLateness(paymentDate1).lateValue, 10 * 300);
        chai.assert.equal(bill.currentLateness(betweenDate).lateValue, 10 * 100 + 15 * 200);
        chai.assert.equal(bill.currentLateness(paymentDate2).lateValue, 10 * 100 + 20 * 200);
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 10 * 100 + 44 * 200);
        chai.assert.equal(bill.lateValueOutstanding, 10 * 100 + 25 * 200);

        const paymentId2 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, partnerId: FixtureA.supplier, valueDate: paymentDate2, payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.outstanding, 0);
        // lateness
        chai.assert.equal(bill.currentLateness(paymentDate1).lateValue, 10 * 300);
        chai.assert.equal(bill.currentLateness(betweenDate).lateValue, 10 * 100 + 15 * 200);
        chai.assert.equal(bill.currentLateness(paymentDate2).lateValue, 10 * 100 + 20 * 200);
        chai.assert.equal(bill.currentLateness(laterDate).lateValue, 10 * 100 + 20 * 200);
        chai.assert.equal(bill.lateValueOutstanding, 10 * 100 + 20 * 200);

        let tx1 = Transactions.findOne(paymentId1);
        chai.assert.equal(tx1.category, 'payment');
        chai.assert.equal(tx1.amount, 100);
        chai.assert.isFalse(tx1.isPosted());
        chai.assert.isUndefined(tx1.debit);
        chai.assert.isUndefined(tx1.credit);
        let tx2 = Transactions.findOne(paymentId2);
        chai.assert.equal(tx2.category, 'payment');
        chai.assert.equal(tx2.amount, 200);
        chai.assert.isFalse(tx2.isPosted());
        chai.assert.isUndefined(tx2.debit);
        chai.assert.isUndefined(tx2.credit);

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId1 });
        tx1 = Transactions.findOne(paymentId1);
        chai.assert.isTrue(tx1.isPosted());
        chai.assert.deepEqual(tx1.debit, [{ amount: 100, account: '`454', localizer: '@', partner: bill.partnerContractCode() }]);
        chai.assert.deepEqual(tx1.credit, [{ amount: 100, account: bankAccount }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200);

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        tx2 = Transactions.findOne(paymentId2);
        chai.assert.isTrue(tx2.isPosted());
        chai.assert.deepEqual(tx2.debit, [{ amount: 200, account: '`454', localizer: '@', partner: bill.partnerContractCode() }]);
        chai.assert.deepEqual(tx2.credit, [{ amount: 200, account: bankAccount }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 0);
      });

      it('Can storno a Payment', function () {
        let payment1 = Transactions.findOne({ category: 'payment', amount: 100 });
        FixtureA.builder.execute(Transactions.methods.remove, { _id: payment1._id });

        payment1 = Transactions.findOne(payment1._id);
        chai.assert.equal(payment1.status, 'void');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 100);
      });

      it('Can reallocate a Payment', function () {
        let payment2 = Transactions.findOne({ category: 'payment', amount: 200 });
        FixtureA.builder.execute(Transactions.methods.reallocate, { _id: payment2._id, modifier: { $set: {
          bills: [{ id: billId, amount: 180 }],
          lines: [{ account: '`454', amount: 20 }],
        } } });

        payment2 = Transactions.findOne(payment2._id);
        chai.assert.equal(payment2.status, 'posted');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 120);
      });

      it('Can not reallocate a Payment with wrong amount', function () {
        const paymentId3 = FixtureA.builder.create('payment', {
          bills: [{ id: billId, amount: 100 }],
          lines: [{ account: '`454', amount: 150 }],
          amount: 250,
          partnerId: FixtureA.supplier,
          valueDate: Clock.currentTime(),
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId3 });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 20);
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.reallocate, { _id: paymentId3, modifier: { $set: {
            bills: [{ id: billId, amount: 150 }],
            lines: [{ account: '`454', amount: 100 }],
          } } });
        }, 'err_sanityCheckFailed');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 20);
        FixtureA.builder.execute(Transactions.methods.reallocate, { _id: paymentId3, modifier: { $set: {
          bills: [{ id: billId, amount: 120 }],
          lines: [{ account: '`454', amount: 130 }],
        } } });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 0);

        Transactions.remove({ partnerId: FixtureA.supplier, category: 'payment' });
      });

      it('Can create identification as Payment when there is overpayment from previous payments', function () {
        chai.assert.deepEqual(Accounts.toLocalize(FixtureA.demoCommunityId), ['`454', '`31', '`33', '`431', '`434']);
        // FixtureA.supplier has a bill of 300, out of which we pay 250, and pay 80 more as unidentified
        const paymentId3 = FixtureA.builder.create('payment', {
          bills: [{ id: billId, amount: 250 }],
          // lines: [{ account: '`431', amount: 100 }], // remainder is unallocated, will be put to 431 account automatically
          amount: 330,
          partnerId: FixtureA.supplier,
          valueDate: Clock.currentTime(),
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId3 });
        let payment3 = Transactions.findOne(paymentId3);
        chai.assert.equal(payment3.debit[0].account, '`454');
        chai.assert.equal(payment3.debit[0].amount, 250);
        chai.assert.equal(payment3.debit[1].account, Txdefs.findOne(payment3.defId).unidentifiedAccount());
        chai.assert.equal(payment3.debit[1].amount, 80);
        chai.assert.equal(payment3.credit[0].account, '`381');
        chai.assert.equal(payment3.credit[0].amount, 330);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 50);
        chai.assert.equal(payment3.outstanding, 80);
        chai.assert.equal(payment3.partner().balance(), -30);
        chai.assert.equal(payment3.contract().outstanding(), -30);
        chai.assert.equal(payment3.contract().outstanding('`454'), 50);
        chai.assert.equal(payment3.contract().outstanding('`434'), -80);
        chai.assert.equal(bill.availableAmountFromOverPayment(), 80);

        const identificationDefId = bill.correspondingIdentificationTxdef()._id;
        const identificationId = FixtureA.builder.create('payment', {
          defId: identificationDefId,
          bills: [{ id: billId, amount: 50 }],
          amount: 50,
          partnerId: FixtureA.supplier,
          valueDate: Clock.currentTime(),
          payAccount: '`434' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: identificationId });
        const identification = Transactions.findOne(identificationId);
        bill = Transactions.findOne(billId);
        payment3 = Transactions.findOne(paymentId3);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(identification.debit[0].account, '`454');
        chai.assert.equal(identification.debit[0].amount, 50);
        chai.assert.equal(identification.credit[0].account, '`434');
        chai.assert.equal(identification.credit[0].amount, 50);
        chai.assert.equal(payment3.outstanding, 80);
        chai.assert.equal(identification.outstanding, 0);
        chai.assert.equal(payment3.partner().balance(), -30);
        chai.assert.equal(payment3.contract().outstanding(), -30);
        chai.assert.equal(payment3.contract().outstanding('`454'), 0);
        chai.assert.equal(payment3.contract().outstanding('`434'), -30);
        chai.assert.equal(bill.availableAmountFromOverPayment(), 30);

        // Removing only the identification, so we leave a partially paid bill for the next test
        Transactions.remove({ partnerId: FixtureA.supplier, category: 'payment', payAccount: '`434' });
      });

      it('Can not identify more from overpayment than the bill outstanding', function () {
        const identificationDefId = bill.correspondingIdentificationTxdef()._id;
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', {
            defId: identificationDefId,
            bills: [{ id: billId, amount: 60 }],
            amount: 60,
            partnerId: FixtureA.supplier,
            valueDate: Clock.currentTime(),
            payAccount: '`434' });
        }, 'err_sanityCheckFailed');
      });

      it('Can not identify more from overpayment than whats available on the partner contract', function () {
        const identificationDefId = bill.correspondingIdentificationTxdef()._id;
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', {
            defId: identificationDefId,
            bills: [{ id: billId, amount: 350 }],
            amount: 35,
            partnerId: FixtureA.supplier,
            valueDate: Clock.currentTime(),
            payAccount: '`431' });
        }, 'err_notAllowed');
      });

      it('Can remission a partially paid bill ', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 50);
        chai.assert.equal(bill.contract().outstanding(), -30);
        const remissionDefId = bill.correspondingRemissionTxdef()._id;
        const remissionId = FixtureA.builder.create('payment', {
          defId: remissionDefId,
          bills: [{ id: billId, amount: 50 }],
          amount: 50,
          partnerId: FixtureA.supplier,
          valueDate: Clock.currentTime(),
          // no payAccount
        });
        FixtureA.builder.execute(Transactions.methods.post, { _id: remissionId });
        const remission = Transactions.findOne(remissionId);
        bill = Transactions.findOne(billId);
        const locationTags = { localizer: '@', partner: bill.partnerContractCode() };
        chai.assert.deepEqual(bill.debit, [
          { amount: 300, account: '`861' }]);
        chai.assert.deepEqual(bill.credit, [
          { amount: 300, account: '`454', ...locationTags }]);
        chai.assert.deepEqual(remission.debit, [
          { amount: 50, account: '`454', ...locationTags }]);
        chai.assert.deepEqual(remission.credit, [
          { amount: 50, account: '`861' }]);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.contract().outstanding(), -80);

        Transactions.remove({ partnerId: FixtureA.supplier, category: 'payment' });
      });
    });

    xdescribe('Non-bill allocation', function () {
      it('Can create a Payment which is not allocated to bills', function () {
        const bankAccount = '`381';
        const parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'A103' });
        const parcel2 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'A104' });
        const contract1 = parcel1.payerContract(); chai.assert.isDefined(contract1);
        const contract2 = parcel2.payerContract(); chai.assert.isDefined(contract2);

        const paymentId = FixtureA.builder.create('payment', {
          amount: 100, relation: 'member', partnerId: parcel1.payerContract().partner()._id, valueDate: Clock.currentTime(), payAccount: bankAccount, lines: [
            { amount: 20, account: '`33', localizer: '@A103' },
            { amount: 80, account: '`31', localizer: '@A104' },
          ],
        });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
        const tx = Transactions.findOne(paymentId);

        chai.assert.isTrue(tx.isPosted());
        chai.assert.deepEqual(tx.debit, [{ amount: 100, account: bankAccount }]);
        chai.assert.deepEqual(tx.credit, [
          { amount: 20, account: '`33', localizer: '@A103', parcelId: parcel1._id },
          { amount: 80, account: '`31', localizer: '@A104', parcelId: parcel2._id },
        ]);
        chai.assert.equal(parcel1.outstanding(), 20);
        chai.assert.equal(parcel2.outstanding(), 80);
        chai.assert.equal(contract1.outstanding(), 20);
        chai.assert.equal(contract2.outstanding(), 80);  // contract2 belongs to other partner, partnerId is required on line and journalEntry
      });
    });

    describe('Dealing with different signs', function () {
      let createBill;
      let billLinePos1;
      let billLinePos2;
      let billLineNeg;
      let parcelId;
      let localizer;
      let partnerId;
      let locationTags;
      let supplierId;
      before(function () {
        partnerId = FixtureA.partnerId(FixtureA.dummyUsers[1]);
        supplierId = FixtureA.supplier;
        parcelId = FixtureA.dummyParcels[1];
        localizer = '@AP01';
        locationTags = { localizer, parcelId };
        createBill = function (lines, relation = 'member') {
          if (relation === 'supplier') partnerId = FixtureA.supplier;
          if (relation === 'customer') partnerId = FixtureA.customer;
          const billId = FixtureA.builder.create('bill', {
            relation,
            partnerId,
            relationAccount: '`33',
            issueDate: moment.utc('2020-01-05').toDate(),
            deliveryDate: moment.utc('2020-01-02').toDate(),
            dueDate: moment.utc('2020-01-30').toDate(),
            lines,
          });
          const bill = Transactions.findOne(billId);
          if (relation === 'member') locationTags.partner = bill.partnerContractCode();
          return billId;
        };
        const billingId1 = FixtureA.builder.create('parcelBilling', {
          title: 'Common cost',
          projection: { base: 'area', unitPrice: 300 },
          digit: '1',
        });
        const billingId2 = FixtureA.builder.create('parcelBilling', {
          title: 'Heating',
          projection: { base: 'volume', unitPrice: 50 },
          digit: '24',
        });
        billLinePos1 = {
          title: 'Common cost',
          uom: 'month',
          quantity: 1,
          unitPrice: 300,
          localizer,
          parcelId,
          billing: { id: billingId1 },
          account: '`951',
        };
        billLinePos2 = {
          title: 'Heating',
          uom: 'kJ',
          quantity: 5,
          unitPrice: 50,
          localizer,
          parcelId,
          billing: { id: billingId2 },
          account: '`9524',
        };
        billLineNeg = {
          title: 'Heating',
          uom: 'kJ',
          quantity: -2,
          unitPrice: 50,
          localizer,
          parcelId,
          billing: { id: billingId2 },
          account: '`9524',
        };
      });

      describe('Create payment for crediting', function () {

        it('Can create negative payment for negative bill amount', function () {
          const billId = createBill([billLineNeg, billLineNeg]);
          let bill = Transactions.findOne(billId);
          const partner = Partners.findOne(partnerId);
          chai.assert.equal(bill.amount, -200);
          chai.assert.equal(bill.outstanding, -200);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          chai.assert.equal(partner.outstanding(undefined, 'member'), -200);

          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId, amount: -200 }],
            amount: -200,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          const payment = Transactions.findOne(paymentId);
          bill = Transactions.findOne(billId);
          chai.assert.equal(payment.amount, -200);
          chai.assert.equal(bill.outstanding, 0);
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          chai.assert.equal(partner.outstanding(undefined, 'member'), 0);
        });

        it('Can create negative payment for bills of mixed sign', function () {
          const billId1 = createBill([billLineNeg, billLineNeg, billLineNeg, billLineNeg]);
          let bill1 = Transactions.findOne(billId1);
          const billId2 = createBill([billLinePos1]);
          let bill2 = Transactions.findOne(billId2);
          const billId3 = createBill([billLinePos2, billLineNeg, billLineNeg]);
          let bill3 = Transactions.findOne(billId3);
          const partner = Partners.findOne(partnerId);
          chai.assert.equal(bill1.outstanding, -400);
          chai.assert.equal(bill2.outstanding, 300);
          chai.assert.equal(bill3.outstanding, 50);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId3 });
          chai.assert.equal(partner.outstanding(undefined, 'member'), -50);

          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -400 }, { id: billId2, amount: 300 }, { id: billId3, amount: 50 }],
            amount: -50,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          const payment = Transactions.findOne(paymentId);
          bill1 = Transactions.findOne(billId1);
          bill2 = Transactions.findOne(billId2);
          bill3 = Transactions.findOne(billId3);
          chai.assert.equal(bill1.outstanding, 0);
          chai.assert.equal(bill2.outstanding, 0);
          chai.assert.equal(bill3.outstanding, 0);
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          chai.assert.equal(partner.outstanding(undefined, 'member'), 0);
        });

        it('Can create partial payment for bills of mixed sign', function () {
          const billId1 = createBill([billLineNeg, billLineNeg, billLineNeg, billLineNeg]);
          let bill1 = Transactions.findOne(billId1);
          const billId2 = createBill([billLinePos1]);
          let bill2 = Transactions.findOne(billId2);
          const billId3 = createBill([billLinePos2, billLinePos2]);
          let bill3 = Transactions.findOne(billId3);
          const partner = Partners.findOne(partnerId);
          chai.assert.equal(bill1.outstanding, -400);
          chai.assert.equal(bill2.outstanding, 300);
          chai.assert.equal(bill3.outstanding, 500);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId3 });
          chai.assert.equal(partner.outstanding(undefined, 'member'), 400);

          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -400 }, { id: billId2, amount: 300 }, { id: billId3, amount: 200 }],
            amount: 100,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          const payment = Transactions.findOne(paymentId);
          bill1 = Transactions.findOne(billId1);
          bill2 = Transactions.findOne(billId2);
          bill3 = Transactions.findOne(billId3);
          chai.assert.equal(payment.amount, 100);
          chai.assert.equal(payment.outstanding, 0);
          chai.assert.equal(bill1.outstanding, 0);
          chai.assert.equal(bill2.outstanding, 0);
          chai.assert.equal(bill3.outstanding, 300);
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          chai.assert.equal(partner.outstanding(undefined, 'member'), 300);

          FixtureA.builder.execute(Transactions.methods.remove, { _id: paymentId });

          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -400 }, { id: billId2, amount: 200 }, { id: billId3, amount: 100 }],
            amount: -100,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          const payment2 = Transactions.findOne(paymentId2);
          bill1 = Transactions.findOne(billId1);
          bill2 = Transactions.findOne(billId2);
          bill3 = Transactions.findOne(billId3);
          chai.assert.equal(payment2.amount, -100);
          chai.assert.equal(payment2.outstanding, 0);
          chai.assert.equal(bill1.outstanding, 0);
          chai.assert.equal(bill2.outstanding, 100);
          chai.assert.equal(bill3.outstanding, 400);
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          chai.assert.equal(partner.outstanding(undefined, 'member'), 500);
        });

        it('Does NOT create negative payment for positive bill sum', function () {
          let bill = Transactions.findOne({ partnerId, category: 'bill', amount: 500 });
          chai.assert.equal(bill.outstanding, 400);

          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'member',
              bills: [{ id: bill._id, amount: -400 }],
              amount: -400,
              partnerId,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_notAllowed');
          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'member',
              bills: [{ id: bill._id, amount: 400 }],
              amount: -400,
              partnerId,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_notAllowed');
          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'member',
              bills: [{ id: bill._id, amount: 400 }],
              lines: [{ amount: -800, account: '`331' }],
              amount: -400,
              partnerId,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_sanityCheckFailed');

          const bill2 = Transactions.findOne({ partnerId, category: 'bill', outstanding: 100 });
          const partner = Partners.findOne(partnerId);
          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: bill._id, amount: 400 }, { id: bill2._id, amount: 100 }],
            amount: 500,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          bill = Transactions.findOne(bill._id);
          chai.assert.equal(bill.outstanding, 0);
          chai.assert.equal(partner.outstanding(undefined, 'member'), 0);
        });

        it('Does NOT create positive payment for negative bill sum', function () {
          const billId1 = createBill([billLineNeg, billLineNeg, billLineNeg], 'customer'); // -300
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          const billId2 = createBill([billLinePos2], 'customer'); // +250
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          const partner = Partners.findOne(FixtureA.customer);
          chai.assert.equal(partner.outstanding(undefined, 'customer'), -50);

          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'customer',
              bills: [{ id: billId1, amount: -300 }, { id: billId2, amount: 250 }],
              amount: 50,
              partnerId: FixtureA.customer,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_notAllowed');
          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'customer',
              bills: [{ id: billId1, amount: -250 }, { id: billId2, amount: 200 }],
              amount: 50,
              partnerId: FixtureA.customer,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_notAllowed');
          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'customer',
              bills: [{ id: billId1, amount: -300 }, { id: billId2, amount: 250 }],
              lines: [{ amount: 100, account: '`331' }],
              amount: 50,
              partnerId: FixtureA.customer,
              valueDate: Clock.currentTime(),
              payAccount: '`381' });
          }, 'err_sanityCheckFailed');

          const paymentId1 = FixtureA.builder.create('payment', {
            relation: 'customer',
            bills: [{ id: billId1, amount: -200 }, { id: billId2, amount: 250 }],
            amount: 50,
            partnerId: FixtureA.customer,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId1 });
          chai.assert.equal(partner.outstanding(undefined, 'customer'), -100);
          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'customer',
            bills: [{ id: billId1, amount: -100 }],
            amount: -100,
            partnerId: FixtureA.customer,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          chai.assert.equal(partner.outstanding(undefined, 'customer'), 0);
        });

        it('Can create negative payment for supplier', function () {
          const billId1 = createBill([billLineNeg, billLineNeg, billLineNeg, billLineNeg], 'supplier');
          let bill1 = Transactions.findOne(billId1);
          const billId2 = createBill([billLinePos1], 'supplier');
          let bill2 = Transactions.findOne(billId2);
          const partner = Partners.findOne(FixtureA.supplier);
          chai.assert.equal(bill1.outstanding, -400);
          chai.assert.equal(bill2.outstanding, 300);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          chai.assert.equal(partner.outstanding(undefined, 'supplier'), -100);

          const entryId = FixtureA.builder.create('statementEntry', {
            communityId: FixtureA.demoCommunityId,
            account: '`381',
            valueDate: Clock.currentDate(),
            name: partner.idCard.name,
            amount: 100,
          });
          FixtureA.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
          const entry = StatementEntries.findOne(entryId);
          chai.assert.equal(entry.isReconciled(), false);
          chai.assert.equal(entry.match.confidence, 'success');
          chai.assert.equal(entry.match.tx.category, 'payment');
          chai.assert.equal(entry.match.tx.amount, -100);

          const paymentId = FixtureA.builder.create('payment', {
            relation: 'supplier',
            bills: [{ id: billId1, amount: -400 }, { id: billId2, amount: 300 }],
            amount: -100,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          const payment = Transactions.findOne(paymentId);
          bill1 = Transactions.findOne(billId1);
          bill2 = Transactions.findOne(billId2);
          chai.assert.equal(payment.amount, -100);
          chai.assert.equal(payment.outstanding, 0);
          chai.assert.equal(bill1.outstanding, 0);
          chai.assert.equal(bill2.outstanding, 0);
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          chai.assert.equal(partner.outstanding(undefined, 'supplier'), 0);
        });
      });

      describe('Posts payment right, when ...', function () {
    /*  N0  only positive items on bill
        N2  negative item on bill at the beginning
        N1  negative item on bill at the end
        BA+  bill amount is positive
        BA-  bill amount is negative
        BA0  bill amount is zero
        A0  payment is the exact amount of bill amount
        A<  payment is less than bill amount
        A>  payment is more than bill amount
        B1  payment is assigned to one bill
        B2  payment is assigned to more bills
        P0  no payment yet for this bill
        P1  there was a payment in part for this bill */

        // N0, BA+, A0, B1, P0
        it('positive items, no payment yet, assigned to one bill', function () {
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          const bill = Transactions.findOne(billId);
          chai.assert.deepEqual(bill.debit, [
            { amount: 300, account: '`331', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(bill.credit, [
            { amount: 300, account: '`951' },
            { amount: 250, account: '`9524' }]);
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId, amount: 550 }],
            amount: 550,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [{ amount: 550, account: '`381' }]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`331', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags }]);
        });

        // N1-N2, BA+, A<, B2, P0-P1
        it('negative item, part payment, assigned to more bills', function () {
          const billId1 = createBill([billLinePos1, billLinePos2, billLineNeg]); // 300, 250, -100
          const billId2 = createBill([billLineNeg, billLinePos2, billLinePos1]); // -100, 250, 300
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          const bill1 = Transactions.findOne(billId1);
          chai.assert.deepEqual(bill1.debit, [
            { amount: 300, account: '`331', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags },
            { amount: -100, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(bill1.credit, [
            { amount: 300, account: '`951' },
            { amount: 250, account: '`9524' },
            { amount: -100, account: '`9524' }]);

          const paymentId1 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 210 }],
            amount: 210,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId1 });
          const payment1 = Transactions.findOne(paymentId1);
          chai.assert.deepEqual(payment1.debit, [
            { amount: 210, account: '`381' },
            { amount: 100, account: '`3324', ...locationTags },
          ]);
          chai.assert.deepEqual(payment1.credit, [
            { amount: 300, account: '`331', ...locationTags },
            { amount: 10, account: '`3324', ...locationTags },
          ]);

          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 240 }, { id: billId2, amount: 450 }],
            amount: 690,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          const payment2 = Transactions.findOne(paymentId2);
          chai.assert.deepEqual(payment2.debit, [
            { amount: 690, account: '`381' },
            { amount: 100, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(payment2.credit, [
            { amount: 240, account: '`3324', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags },
            { amount: 300, account: '`331', ...locationTags }]);
        });

        // N1, BA-, A0, B2, P0
        it('negative bill amount, assigned to more bills', function () {
          const billId1 = createBill([billLineNeg, billLineNeg]);
          const billId2 = createBill([billLinePos1]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -200 }, { id: billId2, amount: 300 }],
            amount: 100,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [
            { amount: 100, account: '`381' },
            { amount: 100, account: '`3324', ...locationTags },
            { amount: 100, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`331', ...locationTags }]);
        });

        // N1, BA-, A0, B1, P0
        it('negative bill amount, assigned to one bill, negative payment', function () {
          const billId1 = createBill([billLineNeg, billLineNeg]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -200 }],
            amount: -200,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [
            { amount: 100, account: '`3324', ...locationTags },
            { amount: 100, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(payment.credit, [{ amount: 200, account: '`381' }]);
        });

        // BA+, A<, B1, P0-P1
        it('positive bill amount, positive payment, partially paid', function () {
          const billId1 = createBill([billLinePos1, billLinePos2, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 300 }],
            amount: 300,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [{ amount: 300, account: '`381' }]);
          chai.assert.deepEqual(payment.credit, [{ amount: 300, account: '`331', ...locationTags }]);

          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 500 }],
            amount: 500,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          const payment2 = Transactions.findOne(paymentId2);
          chai.assert.deepEqual(payment2.debit, [{ amount: 500, account: '`381' }]);
          chai.assert.deepEqual(payment2.credit, [
            { amount: 250, account: '`3324', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags },
          ]);
        });

        // N1-N2, BA-, A<, B1, P0
        it('negative bill amount, negative payment, partially paid', function () {
          const billId1 = createBill([billLineNeg, billLinePos2, billLineNeg, billLineNeg]); // -50
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -20 }],
            amount: -20,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [
            { amount: 100, account: '`3324', ...locationTags },
            { amount: 100, account: '`3324', ...locationTags },
            { amount: 70, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 20, account: '`381' },
            { amount: 250, account: '`3324', ...locationTags }]);

          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: -30 }],
            amount: -30,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          const payment2 = Transactions.findOne(paymentId2);
          chai.assert.deepEqual(payment2.debit, [{ amount: 30, account: '`3324', ...locationTags }]);
          chai.assert.deepEqual(payment2.credit, [{ amount: 30, account: '`381' }]);
        });

        it('assigned to bill and remainder in a line', function () {
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId, amount: 550 }],
            lines: [{ amount: 450, account: '`331', localizer }],
            amount: 1000,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [{ amount: 1000, account: '`381' }]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`331', ...locationTags },
            { amount: 250, account: '`3324', ...locationTags },
            { amount: 450, account: '`331', ...locationTags }]);
        });

        it('only lines on payment (not assigned to bill)', function () {
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            lines: [
              { amount: 20, account: '`331', localizer },
              { amount: 80, account: '`3324', localizer },
            ],
            amount: 100,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          const locationTagsWoContract = _.extend(locationTags, { partner: partnerId });
          chai.assert.deepEqual(payment.debit, [{ amount: 100, account: '`381' }]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 20, account: '`331', ...locationTagsWoContract },
            { amount: 80, account: '`3324', ...locationTagsWoContract },
          ]);
        });

        xit('throws for non allocated remainder ', function () { // now remainder goes to unidentified account as outstanding
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              relation: 'member',
              bills: [{ id: billId, amount: 550 }],
              amount: 1000,
              partnerId,
              valueDate: Clock.currentTime(),
              payAccount: '`381',
            });
          }, 'err_notAllowed');
        });
      });

      describe('Bills accounting lifecycle with Cash accountingMethod', function () {
        before(function () {
          Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'cash' } });
        });

        it('positive items, no payment yet, assigned to one bill', function () {
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          const bill = Transactions.findOne(billId);
          chai.assert.deepEqual(bill.debit, [
            { amount: 300, account: '`0331', ...locationTags },
            { amount: 250, account: '`03324', ...locationTags },
          ]);
          chai.assert.deepEqual(bill.credit, [
            { amount: 300, account: '`0951' },
            { amount: 250, account: '`09524' },
          ]);

          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId, amount: 550 }],
            amount: 550,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [
            { amount: 550, account: '`381' },
            { amount: 300, account: '`0951', subTx: 1 },
            { amount: 250, account: '`09524', subTx: 1 },
          ]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`951' },
            { amount: 300, account: '`0331', ...locationTags, subTx: 1 },
            { amount: 250, account: '`9524' },
            { amount: 250, account: '`03324', ...locationTags, subTx: 1 },
          ]);
        });

        it('negative item, part payment, assigned to more bills', function () {
          const billId1 = createBill([billLinePos1, billLinePos2, billLineNeg]); // 300, 250, -100
          const billId2 = createBill([billLineNeg, billLinePos2, billLinePos1]); // -100, 250, 300
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          const bill = Transactions.findOne(billId1);
          chai.assert.deepEqual(bill.debit, [
            { amount: 300, account: '`0331', ...locationTags },
            { amount: 250, account: '`03324', ...locationTags },
            { amount: -100, account: '`03324', ...locationTags },
          ]);
          chai.assert.deepEqual(bill.credit, [
            { amount: 300, account: '`0951' },
            { amount: 250, account: '`09524' },
            { amount: -100, account: '`09524' },
          ]);
          const paymentId1 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 210 }],
            amount: 210,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId1 });
          const payment1 = Transactions.findOne(paymentId1);
          chai.assert.deepEqual(payment1.debit, [
            { amount: 210, account: '`381' },
            { amount: 100, account: '`9524' },
            { amount: 100, account: '`03324', ...locationTags, subTx: 1 },
            { amount: 300, account: '`0951', subTx: 1 },
            { amount: 10, account: '`09524', subTx: 1 },
          ]);
          chai.assert.deepEqual(payment1.credit, [
            { amount: 100, account: '`09524', subTx: 1 },
            { amount: 300, account: '`951' },
            { amount: 300, account: '`0331', ...locationTags, subTx: 1 },
            { amount: 10, account: '`9524' },
            { amount: 10, account: '`03324', ...locationTags, subTx: 1 },
          ]);

          const paymentId2 = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId1, amount: 240 }, { id: billId2, amount: 450 }],
            amount: 690,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
          const payment2 = Transactions.findOne(paymentId2);
          chai.assert.deepEqual(payment2.debit, [
            { amount: 690, account: '`381' },
            { amount: 240, account: '`09524', subTx: 1 },
            { amount: 100, account: '`9524' },
            { amount: 100, account: '`03324', ...locationTags, subTx: 1 },
            { amount: 250, account: '`09524', subTx: 1 },
            { amount: 300, account: '`0951', subTx: 1 },
          ]);
          chai.assert.deepEqual(payment2.credit, [
            { amount: 240, account: '`9524' },
            { amount: 240, account: '`03324', ...locationTags, subTx: 1 },
            { amount: 100, account: '`09524', subTx: 1 },
            { amount: 250, account: '`9524' },
            { amount: 250, account: '`03324', ...locationTags, subTx: 1 },
            { amount: 300, account: '`951' },
            { amount: 300, account: '`0331', ...locationTags, subTx: 1 },
          ]);
        });

        it('assigned to bill and remainder in a line', function () {
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          const paymentId = FixtureA.builder.create('payment', {
            relation: 'member',
            bills: [{ id: billId, amount: 550 }],
            lines: [{ amount: 450, account: '`952', localizer }],
            amount: 1000,
            partnerId,
            valueDate: Clock.currentTime(),
            payAccount: '`381' });
          FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
          const payment = Transactions.findOne(paymentId);
          chai.assert.deepEqual(payment.debit, [
            { amount: 1000, account: '`381' },
            { amount: 300, account: '`0951', subTx: 1 },
            { amount: 250, account: '`09524', subTx: 1 },
            { amount: 450, account: '`0952', subTx: 1 },
          ]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`951' },
            { amount: 300, account: '`0331', ...locationTags, subTx: 1 },
            { amount: 250, account: '`9524' },
            { amount: 250, account: '`03324', ...locationTags, subTx: 1 },
            { amount: 450, account: '`952' },
            { amount: 450, account: '`0332', ...locationTags, subTx: 1 },
          ]);
        });
      });
    });

    describe('Other transaction types', function () {

      describe('Exchange', function () {
        let partnerId;
        let partner;
        let otherPartnerId;
        let otherPartner;
        let parcelId;
        let localizer;
        let exchange;
        before(function() {
          partnerId = FixtureA.partnerId(FixtureA.dummyUsers[1]);
          partner = Partners.findOne(partnerId);
          otherPartnerId = FixtureA.partnerId(FixtureA.dummyUsers[4]);
          otherPartner = Partners.findOne(otherPartnerId);
          parcelId = FixtureA.dummyParcels[1];
          localizer = '@AP01';
          exchange = function exchange(fromPartner, toPartner, amount, account = '`431', withPosting = false) {
            const _id = FixtureA.builder.create('exchange', Object.cleanUndefined({
              amount,
              account,
              fromPartner,
              toPartner,
            }));
            if (withPosting) FixtureA.builder.execute(Transactions.methods.post, { _id });
            return _id;
          };
        });

        after(function () {
//          Transactions.remove(txId);
        });

        it('Not allowed to give from nothing', function () {
          chai.assert.equal(partner.balance(), 0);
          chai.assert.equal(otherPartner.balance(), 0);

          chai.assert.throws(() => {
            exchange(partnerId, otherPartnerId, 100);
          }, 'err_notAllowed');
        });

        it('Only allowed to identify to a partner, whats there without any partner', function () {
          const _id = FixtureA.builder.create('transfer', {
            defId: Txdefs.getByName('Non identified income', FixtureA.demoCommunityId)._id,
            amount: 500,
            fromAccount: '`431',
            toAccount: '`382',
          });
          FixtureA.builder.execute(Transactions.methods.post, { _id });

          chai.assert.equal(partner.balance(), 0);
          chai.assert.equal(otherPartner.balance(), 0);
          const communityId = FixtureA.demoCommunityId;
          const account = '`431';
          chai.assert.equal(Balances.get({ communityId, account, tag: 'T' }).total(), -500);
          chai.assert.equal(Balances.get({ communityId, account, tag: 'T', partner: 'All' }).total(), 0);

          chai.assert.throws(() => {
            exchange(undefined, otherPartnerId, 600);
          }, 'err_notAllowed');

          exchange(undefined, partnerId, 300, '`431', true);
          exchange(undefined, otherPartnerId, 200, '`431', true);

          chai.assert.equal(partner.balance(), 300);
          chai.assert.equal(otherPartner.balance(), 200);

          chai.assert.throws(() => {
            exchange(undefined, otherPartnerId, 10);
          }, 'err_notAllowed');
        });

        it('Only allowed to exchange, what that partner has', function () {
          chai.assert.throws(() => {
            exchange(partnerId, otherPartnerId, 350);
          }, 'err_notAllowed');

          exchange(partnerId, otherPartnerId, 250, '`431', true);

          chai.assert.equal(partner.balance(), 50);
          chai.assert.equal(otherPartner.balance(), 450);

          chai.assert.throws(() => {
            exchange(partnerId, otherPartnerId, 60);
          }, 'err_notAllowed');
        });

        it('Can create a payment, only from the amount that a partner has', function () {
          chai.assert.equal(partner.balance(), 50);
          chai.assert.equal(otherPartner.balance(), 450);
          chai.assert.equal(otherPartner.balance('`431'), 450);
          chai.assert.equal(otherPartner.balance('`33'), 0);

          chai.assert.throws(() => {
            FixtureA.builder.create('payment', {
              defId: Txdefs.getByName('Parcel payment identification', FixtureA.demoCommunityId)._id,
              relation: 'member',
              partnerId: otherPartnerId,
              amount: 500,
              payAccount: '`431',
              lines: [{
                amount: 500,
                account: '`33',
                localizer,
              }],
            });
          }, 'err_notAllowed');

          const _id = FixtureA.builder.create('payment', {
            defId: Txdefs.getByName('Parcel payment identification', FixtureA.demoCommunityId)._id,
            relation: 'member',
            partnerId: otherPartnerId,
            amount: 450,
            payAccount: '`431',
            lines: [{
              amount: 450,
              account: '`951',
              localizer,
            }],
          });
          FixtureA.builder.execute(Transactions.methods.post, { _id });

          chai.assert.equal(partner.balance(), 50);
          chai.assert.equal(otherPartner.balance(), 450);
          chai.assert.equal(otherPartner.balance('`431'), 0);
          chai.assert.equal(otherPartner.balance('`33'), 0);
          chai.assert.equal(otherPartner.balance('`033'), 450);
        });
      });

      describe('Free tx', function () {
        let txId;
        before(function() {
          txId = FixtureA.builder.create('freeTx', {
            amount: 1000,
            debit: [{
              account: '`33',
              localizer: '@',
              partner: FixtureA.customer,
            }],
            credit: [{
              account: '`951',
              localizer: '@',
              partner: FixtureA.customer,
            }],
          });
        });

        after(function () {
          Transactions.remove(txId);
        });

        it('Unposted freeTx does not affect balances', function () {
          const partner = Partners.findOne(FixtureA.customer);
          chai.assert.equal(partner.balance(), 0);
        });

        it('Posting removes localization tags from journals where not needed', function () {
          FixtureA.builder.execute(Transactions.methods.post, { _id: txId });
          const tx = Transactions.findOne(txId);
          chai.assert.isDefined(tx.debit[0].localizer);
          chai.assert.isDefined(tx.debit[0].partner);
          chai.assert.isUndefined(tx.credit[0].localizer);
          chai.assert.isUndefined(tx.credit[0].partner);

          const partner = Partners.findOne(FixtureA.customer);
          chai.assert.equal(partner.balance(), -1000);
        });

        it('Amount is autofilled on journal entries', function () {
          const tx = Transactions.findOne(txId);
          chai.assert.equal(tx.debit[0].amount, 1000);
          chai.assert.equal(tx.credit[0].amount, 1000);
        });
      });
    });

    describe('Moving accounts', function () {
      let FixtureC;
      let billId;
      let bill;
      let paymentId1;
      let paymentId2;
      let paymentIdVoid;
      let payment1;
      let payment2;
      let paymentVoid;

      before(function () {
        FixtureC = freshFixture();
        Communities.update(FixtureC.demoCommunityId, { $set: { 'settings.accountingMethod': 'cash' } });
        billId = FixtureC.builder.create('bill', {
          relation: 'supplier',
          partnerId: FixtureC.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            account: '`861',
            localizer: '@',
          }],
        });
        bill = Transactions.findOne(billId);
        FixtureC.builder.execute(Transactions.methods.post, { _id: billId });
      });
      after(function () {
        Transactions.remove(billId);
      });

      it('Cash method uses technical account', function () {
        bill = Transactions.findOne(billId);
        chai.assert.deepEqual(bill.debit, [{ amount: 300, account: '`0861' }]);
        chai.assert.deepEqual(bill.credit, [{ amount: 300, account: '`0454', localizer: '@', partner: bill.partnerContractCode() }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 300);
      });

      it('Can register Payments', function () {
        paymentId1 = FixtureC.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, partnerId: FixtureC.supplier, valueDate: Clock.currentTime(), payAccount: '`381' });
        paymentId2 = FixtureC.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, partnerId: FixtureC.supplier, valueDate: Clock.currentTime(), payAccount: '`381' });
        FixtureC.builder.execute(Transactions.methods.post, { _id: paymentId1 });
        payment1 = Transactions.findOne(paymentId1);
        chai.assert.deepEqual(payment1.debit, [{ amount: 100, account: '`861' }, { amount: 100, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(payment1.credit, [{ amount: 100, account: '`381' }, { amount: 100, account: '`0861', subTx: 1 }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200);

        FixtureC.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        payment2 = Transactions.findOne(paymentId2);
        chai.assert.deepEqual(payment2.debit, [{ amount: 200, account: '`861' }, { amount: 200, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(payment2.credit, [{ amount: 200, account: '`381' }, { amount: 200, account: '`0861', subTx: 1 }]);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 0);
      });

      it('Can storno a Payment', function () {
        FixtureC.builder.execute(Transactions.methods.remove, { _id: paymentId1 });
        payment1 = Transactions.findOne(paymentId1);
        chai.assert.equal(payment1.status, 'void');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 100);
        const billPayments = bill.getPayments();
        voidedIndex = billPayments.findIndex(p => p.id === paymentId1);
        paymentIdVoid = billPayments[voidedIndex + 1].id; // The voiding tx should be immediately following the voided tx
        paymentVoid = Transactions.findOne(paymentIdVoid);
        chai.assert.equal(paymentVoid.status, 'void');
        chai.assert.deepEqual(paymentVoid.debit, [{ amount: -100, account: '`861' }, { amount: -100, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(paymentVoid.credit, [{ amount: -100, account: '`381' }, { amount: -100, account: '`0861', subTx: 1 }]);
      });

      it('Cannot move technical Account', function () {
        // Technical accounts are moved implicitly. It is not allowed to move them by hand.
        const accountT = Accounts.getByCode('`0861', FixtureC.demoCommunityId);
        chai.assert.throws(() => {
          FixtureC.builder.execute(Accounts.methods.update, { _id: accountT._id, $set: { communityId: FixtureC.demoCommunityId, code: '`056' } });
        } /*, 'err_notAllowed'*/);
        chai.assert.throws(() => {
          Accounts.move(FixtureC.demoCommunityId, '`0861', '`056');
        } /*, 'err_notAllowed'*/);
      });

      it('Can move an Account', function () {
        let balanceBefore = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`861', tag: 'T' });
        let balanceAfter = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`56', tag: 'T' });
        chai.assert.notEqual(balanceBefore.total(), 0);
        const balanceTotal = balanceBefore.total();
        chai.assert.equal(balanceAfter.total(), 0);

        const account = Accounts.getByCode('`861', FixtureC.demoCommunityId);
        const accountCommunity = Communities.findOne(account.communityId);
        chai.assert.isTrue(accountCommunity.isTemplate);
        FixtureC.builder.execute(Accounts.methods.update, { _id: account._id, modifier: { $set: { communityId: FixtureC.demoCommunityId, code: '`56' } } }, FixtureC.demoAccountantId);

        bill = Transactions.findOne(billId);
        chai.assert.deepEqual(bill.debit, [{ amount: 300, account: '`056' }]);
        payment1 = Transactions.findOne(paymentId1);
        payment2 = Transactions.findOne(paymentId2);
        paymentVoid = Transactions.findOne(paymentIdVoid);
        chai.assert.equal(bill.lines[0].account, '`56');
        chai.assert.deepEqual(payment1.debit, [{ amount: 100, account: '`56' }, { amount: 100, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(payment1.credit, [{ amount: 100, account: '`381' }, { amount: 100, account: '`056', subTx: 1 }]);
        chai.assert.deepEqual(payment2.debit, [{ amount: 200, account: '`56' }, { amount: 200, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(payment2.credit, [{ amount: 200, account: '`381' }, { amount: 200, account: '`056', subTx: 1 }]);
        chai.assert.deepEqual(paymentVoid.debit, [{ amount: -100, account: '`56' }, { amount: -100, account: '`0454', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(paymentVoid.credit, [{ amount: -100, account: '`381' }, { amount: -100, account: '`056', subTx: 1 }]);

        balanceBefore = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`861', tag: 'T' });
        balanceAfter = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`56', tag: 'T' });
        chai.assert.equal(balanceBefore.total(), 0);
        chai.assert.equal(balanceAfter.total(), balanceTotal);

        const oldAccount = Accounts.getByCode('`861', FixtureC.demoCommunityId);
        const newAccount = Accounts.getByCode('`56', FixtureC.demoCommunityId);
        const oldAccountCommunity = Communities.findOne(oldAccount.communityId);
        const newAccountCommunity = Communities.findOne(newAccount.communityId);
        chai.assert.isTrue(oldAccountCommunity.isTemplate);
        chai.assert.isTrue(!newAccountCommunity.isTemplate);
        FixtureC.builder.execute(Accounts.methods.remove, { _id: newAccount._id });

        balanceAfter = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`56', tag: 'T' });
        chai.assert.equal(balanceAfter.total(), balanceTotal);
        const newOwnAccount = Accounts.getByCode('`56', FixtureC.demoCommunityId);
        const newOwnAccountCommunity = Communities.findOne(newOwnAccount.communityId);
        chai.assert.isTrue(newOwnAccountCommunity.isTemplate);
      });

      it('Can move a PayAccount', function () {
        const account = Accounts.getByCode('`381', FixtureC.demoCommunityId);
        FixtureC.builder.execute(Accounts.methods.update, { _id: account._id, modifier: { $set: { communityId: FixtureC.demoCommunityId, code: '`382' } } }, FixtureC.demoAccountantId);
        payment1 = Transactions.findOne(paymentId1);
        payment2 = Transactions.findOne(paymentId2);
        paymentVoid = Transactions.findOne(paymentIdVoid);
        chai.assert.equal(payment1.payAccount, '`382');
        chai.assert.equal(payment2.payAccount, '`382');
        chai.assert.equal(paymentVoid.payAccount, '`382');
        chai.assert.deepEqual(payment1.credit, [{ amount: 100, account: '`382' }, { amount: 100, account: '`056', subTx: 1 }]);
        chai.assert.deepEqual(payment2.credit, [{ amount: 200, account: '`382' }, { amount: 200, account: '`056', subTx: 1 }]);
        chai.assert.deepEqual(paymentVoid.credit, [{ amount: -100, account: '`382' }, { amount: -100, account: '`056', subTx: 1 }]);
      });

      it('Can move Template Account', function () {
        let balanceBefore = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`0454', partner: bill.partnerContractCode(), tag: 'T' });
        let balanceAfter = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`0451', partner: bill.partnerContractCode(), tag: 'T' });
        chai.assert.notEqual(balanceBefore.total(), 0);
        const balanceTotal = balanceBefore.total();
        chai.assert.equal(balanceAfter.total(), 0);

        const account = Accounts.getByCode('`454', FixtureC.demoCommunityId);
        const accountCommunity = Communities.findOne(account.communityId);
        chai.assert.isTrue(accountCommunity.isTemplate);
        const superUserId = FixtureC.demoAdminId;
        Memberships.direct.insert({ communityId: account.communityId, userId: superUserId, role: 'admin' });
        FixtureC.builder.execute(Accounts.methods.update, { _id: account._id, modifier: { $set: { communityId: account.communityId, code: '`451' } } }, superUserId);

        bill = Transactions.findOne(billId);
        chai.assert.deepEqual(bill.debit, [{ amount: 300, account: '`056' }]);
        chai.assert.deepEqual(bill.credit, [{ amount: 300, account: '`0451', localizer: '@', partner: bill.partnerContractCode() }]);
        payment1 = Transactions.findOne(paymentId1);
        payment2 = Transactions.findOne(paymentId2);
        paymentVoid = Transactions.findOne(paymentIdVoid);
//        console.log('bill', bill, 'payment1', payment1, 'payment2', payment2, 'paymentVoid', paymentVoid);
        chai.assert.equal(bill.relationAccount, '`451');
        chai.assert.deepEqual(payment1.debit, [{ amount: 100, account: '`56' }, { amount: 100, account: '`0451', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(payment2.debit, [{ amount: 200, account: '`56' }, { amount: 200, account: '`0451', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);
        chai.assert.deepEqual(paymentVoid.debit, [{ amount: -100, account: '`56' }, { amount: -100, account: '`0451', localizer: '@', partner: bill.partnerContractCode(), subTx: 1 }]);

        balanceBefore = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`0454', partner: bill.partnerContractCode(), tag: 'T' });
        balanceAfter = Balances.get({ communityId: FixtureC.demoCommunityId, account: '`0451', partner: bill.partnerContractCode(), tag: 'T' });
        chai.assert.equal(balanceBefore.total(), 0);
        chai.assert.equal(balanceAfter.total(), balanceTotal);

        chai.assert.equal(Accounts.findT({ code: '`454', communityId: FixtureC.demoCommunityId }).count(), 0);
        chai.assert.equal(Accounts.findT({ code: '`451', communityId: FixtureC.demoCommunityId }).count(), 1);
      });
    });
  });
}
