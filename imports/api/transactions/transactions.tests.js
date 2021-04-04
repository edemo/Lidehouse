/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Partners } from '../partners/partners';

if (Meteor.isServer) {
  let FixtureA; //, FixtureC;

  describe('transactions', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      FixtureA = freshFixture();
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
      // Need to apply, so the member contracts get created
      FixtureA.builder.execute(ParcelBillings.methods.apply, { communityId: FixtureA.demoCommunityId, ids: [FixtureA.parcelBilling], date: new Date() });
    });
    after(function () {
    });

    describe.only('Bills outstanding lifecycle', function () {
      let billId;
      let bill;
      let paymentId;
      let payment;
      let storno;
      let parcel1;
      let parcel2;
      before(function () {
        parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP01' });
        parcel2 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP02' });
        const partnerId = FixtureA.partnerId(FixtureA.dummyUsers[3]);
        billId = FixtureA.builder.create('bill', {
          relation: 'member',
          partnerId,
          contractId: Contracts.findOne({ partnerId })._id,
          issueDate: new Date('2018-01-05'),
          deliveryDate: new Date('2018-01-02'),
          dueDate: new Date('2018-01-30'),
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
        const memberPaymentDef = Txdefs.findOne({ communityId: FixtureA.communityId, category: 'payment', 'data.relation': 'member' });
        const bankAccount = Accounts.findOne({ communityId: FixtureA.communityId, category: 'bank' });
        payment = FixtureA.builder.build('payment', {
          defId: memberPaymentDef._id,
          relation: bill.relation,
          partnerId: bill.partnerId,
          contractId: bill.contractId,
          valueDate: bill.valueDate,
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
        chai.assert.equal(payment.lines.length, 1);
        chai.assert.equal(payment.lines[0].amount, 2);
        chai.assert.isUndefined(payment.rounding);

        paymentId = FixtureA.builder.execute(Transactions.methods.insert, payment);
      });

      it('Links payment to bill correctly', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.deepEqual(bill.payments[0], { id: paymentId, amount: bill.amount });
        chai.assert.equal(bill.isPosted(), false);
        chai.assert.equal(bill.outstanding, 0);
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
        chai.assert.deepEqual(bill.payments[0], { id: paymentId, amount: 0 });
        chai.assert.equal(bill.outstanding, 1300);
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
        const memberPaymentDef = Txdefs.findOne({ communityId: FixtureA.communityId, category: 'payment', 'data.relation': 'member' });
        const cashAccount = Accounts.findOne({ communityId: FixtureA.communityId, category: 'cash' });
        payment = FixtureA.builder.build('payment', {
          defId: memberPaymentDef._id,
          relation: bill.relation,
          partnerId: bill.partnerId,
          contractId: bill.contractId,
          valueDate: bill.valueDate,
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
        chai.assert.deepEqual(bill.payments[1], { id: paymentId, amount: bill.amount });
        chai.assert.equal(bill.isPosted(), false);
        chai.assert.equal(bill.outstanding, 0);
      });

      it('Bill updates partner balances correctly', function () {
        // Before posting, the balances are not yet effected
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.partner().outstanding('customer'), 0);
        chai.assert.equal(bill.partner().outstanding('supplier'), 0);
        chai.assert.equal(bill.contract().outstanding(), 0);
        chai.assert.equal(parcel1.balance(), 0);
        chai.assert.equal(parcel2.balance(), 0);
        chai.assert.equal(parcel1.outstanding(), 0);
        chai.assert.equal(parcel2.outstanding(), 0);

        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        chai.assert.equal(bill.partner().balance(), -1300);
        chai.assert.equal(bill.contract().balance(), -1300);
        chai.assert.equal(bill.partner().outstanding('customer'), 1300);
        chai.assert.equal(bill.partner().outstanding('supplier'), -1300);
        chai.assert.equal(bill.contract().outstanding(), 1300);
        chai.assert.equal(parcel1.balance(), -300);
        chai.assert.equal(parcel2.balance(), -1000);
        chai.assert.equal(parcel1.outstanding(), 300);
        chai.assert.equal(parcel2.outstanding(), 1000);
      });

      it('Cannot modify a posted bill', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: {
            $set: { contractId: null },
          } });
        }, 'err_permissionDenied');
      });

      it('Payment updates partner balances correctly', function () {
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });

        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
        chai.assert.equal(bill.partner().outstanding('customer'), 0);
        chai.assert.equal(bill.partner().outstanding('supplier'), 0);
        chai.assert.equal(bill.contract().outstanding(), 0);
        chai.assert.equal(parcel1.balance(), 0);
        chai.assert.equal(parcel2.balance(), 0);
        chai.assert.equal(parcel1.outstanding(), 0);
        chai.assert.equal(parcel2.outstanding(), 0);
      });

      it('Cannot modify a posted payment', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.update, { _id: paymentId, modifier: {
            $set: { conrtractId: null },
          } });
        }, 'err_permissionDenied');
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

        chai.assert.equal(bill.outstanding, 1300);
        chai.assert.equal(bill.partner().balance(), 0);
        chai.assert.equal(bill.contract().balance(), 0);
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
    });

    describe('Bills accounting lifecycle with accrual method', function () {
      let billId;
      let bill;
      before(function () {
        billId = FixtureA.builder.create('bill', {
          relation: 'supplier',
          partnerId: FixtureA.supplier,
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
        // chai.assert.equal(bill.partner().outstanding(), 300); // partner.outstanding() is calculated only on posted tx
      });

      it('Can not post without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        }, 'Bill has to be account assigned first');
      });

      xit('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 300 }], amount: 300, valueDate: Clock.currentTime() });
        }, 'Bill has to be account assigned first');
      });

      it('Can post - creates tx in accountig', function () {
        FixtureA.builder.execute(Transactions.methods.update, { _id: billId, modifier: { $set: { 'lines.0.account': '`861', 'lines.0.localizer': '@' } } });
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.isPosted(), true);
        const tx = Transactions.findOne(billId);
        chai.assert.isDefined(tx);
        chai.assert.equal(tx.category, 'bill');
        chai.assert.equal(tx.amount, 300);
        chai.assert.deepEqual(tx.debit, [{ amount: 300, account: '`861', localizer: '@' }]);
        chai.assert.deepEqual(tx.credit, [{ amount: 300, account: '`454', localizer: '@' }]);
        chai.assert.equal(bill.partner().outstanding('supplier'), 300);
      });

      it('Can register Payments', function () {
        const bankAccount = '`381';
        const paymentId1 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, partnerId: FixtureA.supplier, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.outstanding, 200);

        const paymentId2 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, partnerId: FixtureA.supplier, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.outstanding, 0);

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
        chai.assert.deepEqual(tx1.debit, [{ amount: 100, account: '`454', localizer: '@' }]);
        chai.assert.deepEqual(tx1.credit, [{ amount: 100, account: bankAccount }]);
        chai.assert.equal(bill.partner().outstanding('supplier'), 200);

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        tx2 = Transactions.findOne(paymentId2);
        chai.assert.isTrue(tx2.isPosted());
        chai.assert.deepEqual(tx2.debit, [{ amount: 200, account: '`454', localizer: '@' }]);
        chai.assert.deepEqual(tx2.credit, [{ amount: 200, account: bankAccount }]);
        chai.assert.equal(bill.partner().outstanding('supplier'), 0);
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
          lines: [{ account: '`88', amount: 20 }],
        } } });

        payment2 = Transactions.findOne(payment2._id);
        chai.assert.equal(payment2.status, 'posted');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 120);
      });

      it('Can not reallocate a Payment with wrong amount', function () {
        const paymentId3 = FixtureA.builder.create('payment', {
          bills: [{ id: billId, amount: 100 }],
          lines: [{ account: '`861', amount: 150 }],
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
            lines: [{ account: '`861', amount: 100 }],
          } } });
        }, 'err_sanityCheckFailed');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 20);
        FixtureA.builder.execute(Transactions.methods.reallocate, { _id: paymentId3, modifier: { $set: {
          bills: [{ id: billId, amount: 120 }],
          lines: [{ account: '`861', amount: 130 }],
        } } });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 0);
      });
    });

    describe('Non-bill allocation', function () {
      xit('Can create a Payment which is not allocated to bills', function () {
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
        chai.assert.equal(parcel1.outstanding('supplier'), 20);
        chai.assert.equal(parcel2.outstanding('supplier'), 80);
        chai.assert.equal(contract1.outstanding('supplier'), 20);
        chai.assert.equal(contract2.outstanding('supplier'), 80);  // contract2 belongs to other partner, partnerId is required on line and journalEntry
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
      let createBill;
      let createPayment;
      let billLinePos1;
      let billLinePos2;
      let billLineNeg;
      let parcelId;
      let localizer;
      let partnerId
      before(function () {
        partnerId = FixtureA.partnerId(FixtureA.dummyUsers[1]);
        parcelId = FixtureA.dummyParcels[1];
        localizer = '@AP01';
        createBill = function (lines) {
          const billId = FixtureA.builder.create('bill', {
            relation: 'member',
            partnerId,
            issueDate: new Date('2020-01-05'),
            deliveryDate: new Date('2020-01-02'),
            dueDate: new Date('2020-01-30'),
            lines,
          });
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

      // N0, BA+, A0, B1, P0
      it('positive items, no payment yet, assigned to one bill', function () {
        const billId = createBill([billLinePos1, billLinePos2]);
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        const bill = Transactions.findOne(billId);
        chai.assert.deepEqual(bill.debit, [{ amount: 300, account: '`331', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(bill.credit, [{ amount: 300, account: '`951', localizer, parcelId },
          { amount: 250, account: '`9524', localizer, parcelId }]);
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
        chai.assert.deepEqual(payment.credit, [{ amount: 300, account: '`331', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId }]);
      });

      // N1-N2, BA+, A<, B2, P0-P1
      it('negative item, part payment, assigned to more bills', function () {
        const billId1 = createBill([billLinePos1, billLinePos2, billLineNeg]); // 300, 250, -100
        const billId2 = createBill([billLineNeg, billLinePos2, billLinePos1]); // -100, 250, 300
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
        const bill1 = Transactions.findOne(billId1);
        chai.assert.deepEqual(bill1.debit, [
          { amount: 300, account: '`331', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId },
          { amount: 100, account: '`9524', localizer, parcelId }]);
        chai.assert.deepEqual(bill1.credit, [
          { amount: 300, account: '`951', localizer, parcelId },
          { amount: 250, account: '`9524', localizer, parcelId },
          { amount: 100, account: '`3324', localizer, parcelId }]);

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
          { amount: 100, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(payment1.credit, [
          { amount: 300, account: '`331', localizer, parcelId },
          { amount: 10, account: '`3324', localizer, parcelId }]);

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
          { amount: 100, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(payment2.credit, [
          { amount: 240, account: '`3324', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId },
          { amount: 300, account: '`331', localizer, parcelId }]);
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
          { amount: 100, account: '`3324', localizer, parcelId },
          { amount: 100, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(payment.credit, [
          { amount: 300, account: '`331', localizer, parcelId }]);
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
          { amount: 100, account: '`3324', localizer, parcelId },
          { amount: 100, account: '`3324', localizer, parcelId }]);
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
        chai.assert.deepEqual(payment.credit, [{ amount: 300, account: '`331', localizer, parcelId }]);

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
          { amount: 250, account: '`3324', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId },
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
          { amount: 100, account: '`3324', localizer, parcelId },
          { amount: 100, account: '`3324', localizer, parcelId },
          { amount: 70, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(payment.credit, [
          { amount: 20, account: '`381' },
          { amount: 250, account: '`3324', localizer, parcelId }]);

        const paymentId2 = FixtureA.builder.create('payment', {
          relation: 'member',
          bills: [{ id: billId1, amount: -30 }],
          amount: -30,
          partnerId,
          valueDate: Clock.currentTime(),
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        const payment2 = Transactions.findOne(paymentId2);
        chai.assert.deepEqual(payment2.debit, [{ amount: 30, account: '`3324', localizer, parcelId }]);
        chai.assert.deepEqual(payment2.credit, [{ amount: 30, account: '`381' }]);
      });

      it('assigned to bill and remainder in a line', function () {
        const billId = createBill([billLinePos1, billLinePos2]);
        FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        const paymentId = FixtureA.builder.create('payment', {
          relation: 'member',
          bills: [{ id: billId, amount: 550 }],
          lines: [{ amount: 450, account: '`331' }],
          amount: 1000,
          partnerId,
          valueDate: Clock.currentTime(),
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
        const payment = Transactions.findOne(paymentId);
        chai.assert.deepEqual(payment.debit, [{ amount: 1000, account: '`381' }]);
        chai.assert.deepEqual(payment.credit, [{ amount: 300, account: '`331', localizer, parcelId },
          { amount: 250, account: '`3324', localizer, parcelId },
          { amount: 450, account: '`331' }]);
      });

      it('only lines on payment (not assigned to bill)', function () {
        const paymentId = FixtureA.builder.create('payment', {
          relation: 'member',
          lines: [
            { amount: 20, account: '`331' },
            { amount: 80, account: '`3324', localizer },
          ],
          amount: 100,
          partnerId,
          valueDate: Clock.currentTime(),
          payAccount: '`381' });
        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId });
        const payment = Transactions.findOne(paymentId);
        chai.assert.deepEqual(payment.debit, [{ amount: 100, account: '`381' }]);
        chai.assert.deepEqual(payment.credit, [{ amount: 20, account: '`331' },
          { amount: 80, account: '`3324', localizer, parcelId }]);
      });

      it('throws for non allocated remainder ', function () {
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

      describe('cash accountingMethod', function () {
        before(function () {
          Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'cash' } });
        });

        it('positive items, no payment yet, assigned to one bill', function () {
          const billId = createBill([billLinePos1, billLinePos2]);
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
          const bill = Transactions.findOne(billId);
          chai.assert.deepEqual(bill.debit, [
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 250, account: '`3324', localizer, parcelId },
          ]);
          chai.assert.deepEqual(bill.credit, [
            { amount: 300, account: '`0951', localizer, parcelId },
            { amount: 250, account: '`09524', localizer, parcelId },
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
            { amount: 300, account: '`0951', localizer, parcelId },
            { amount: 250, account: '`09524', localizer, parcelId },
          ]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 300, account: '`951', localizer, parcelId },
            { amount: 250, account: '`3324', localizer, parcelId },
            { amount: 250, account: '`9524', localizer, parcelId },
          ]);
        });

        it('negative item, part payment, assigned to more bills', function () {
          const billId1 = createBill([billLinePos1, billLinePos2, billLineNeg]); // 300, 250, -100
          const billId2 = createBill([billLineNeg, billLinePos2, billLinePos1]); // -100, 250, 300
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId1 });
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId2 });
          const bill = Transactions.findOne(billId1);
          chai.assert.deepEqual(bill.debit, [
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 250, account: '`3324', localizer, parcelId },
            { amount: 100, account: '`09524', localizer, parcelId },
          ]);
          chai.assert.deepEqual(bill.credit, [
            { amount: 300, account: '`0951', localizer, parcelId },
            { amount: 250, account: '`09524', localizer, parcelId },
            { amount: 100, account: '`3324', localizer, parcelId },
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
            { amount: 100, account: '`3324', localizer, parcelId },
            { amount: 100, account: '`9524', localizer, parcelId },
            { amount: 300, account: '`0951', localizer, parcelId },
            { amount: 10, account: '`09524', localizer, parcelId },
          ]);
          chai.assert.deepEqual(payment1.credit, [
            { amount: 100, account: '`09524', localizer, parcelId },
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 300, account: '`951', localizer, parcelId },
            { amount: 10, account: '`3324', localizer, parcelId },
            { amount: 10, account: '`9524', localizer, parcelId },
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
            { amount: 240, account: '`09524', localizer, parcelId },
            { amount: 100, account: '`3324', localizer, parcelId },
            { amount: 100, account: '`9524', localizer, parcelId },
            { amount: 250, account: '`09524', localizer, parcelId },
            { amount: 300, account: '`0951', localizer, parcelId },
          ]);
          chai.assert.deepEqual(payment2.credit, [
            { amount: 240, account: '`3324', localizer, parcelId },
            { amount: 240, account: '`9524', localizer, parcelId },
            { amount: 100, account: '`09524', localizer, parcelId },
            { amount: 250, account: '`3324', localizer, parcelId },
            { amount: 250, account: '`9524', localizer, parcelId },
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 300, account: '`951', localizer, parcelId },
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
            { amount: 300, account: '`0951', localizer, parcelId },
            { amount: 250, account: '`09524', localizer, parcelId },
          ]);
          chai.assert.deepEqual(payment.credit, [
            { amount: 300, account: '`331', localizer, parcelId },
            { amount: 300, account: '`951', localizer, parcelId },
            { amount: 250, account: '`3324', localizer, parcelId },
            { amount: 250, account: '`9524', localizer, parcelId },
            { amount: 450, account: '`952', localizer, parcelId },
          ]);
        });
      });
    });
  });
}
