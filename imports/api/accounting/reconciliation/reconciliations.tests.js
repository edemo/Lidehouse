/* eslint-disable one-var, one-var-declaration-per-line */
/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';

if (Meteor.isServer) {
  let Fixture;
  let bankAccount;

  describe('reconciliation', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      Fixture = freshFixture();
      bankAccount = Accounts.findOneT({ communityId: Fixture.demoCommunityId, category: 'bank' });
    });
    after(function () {
    });

    describe('Bills payments reconciliation', function () {
      let billId, billId2;
      let bill, bill2;
//      let statementId;

      beforeEach(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);

/*        statementId = Fixture.builder.create('statement', {
          account: bankAccount.code,
          startDate: moment().subtract(1, 'month').toDate(),
          endDate: new Date(),
          startBalance: 0,
          endBalance: 100,
        });
*/
      });
      afterEach(function () {
        StatementEntries.remove({});
        Transactions.remove({ category: 'payment' });
        Transactions.remove({ category: 'bill' });
      });

      it('Can pay bill by registering a payment tx - later a statementEntry will be matched to it', function () {
        const paymentId = Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount.code });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, false);
        chai.assert.equal(bill.outstanding, 200);
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200 + 200);

        const txId1 = bill.getPayments()[0].id;
        const entryId1 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, txId: txId1 });

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200 + 200);

        const paymentId2 = Fixture.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount.code });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].reconciled, false);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200 + 0);

        const txId2 = bill.getPayments()[1].id;
        const entryId2 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -200,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2, txId: txId2 });
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200 + 0);
      });

      it('Can NOT reconcile statementEntry with different account or date', function () {
        Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount.code });
        bill = Transactions.findOne(billId);
        const txId = bill.getPayments()[0].id;
/*
        const entryIdWrongRelation = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Customer Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongRelation, txId });
        }, 'err_notAllowed');
*/
        const entryIdWrongAccount = Fixture.builder.create('statementEntry', {
          account: bankAccount.code + '1',
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAccount, txId });
        }, 'err_notAllowed');

/*         const entryIdSmallerAmount = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -80,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdSmallerAmount, txId });
        }, 'err_notAllowed');

        const entryIdWrongSign = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: 100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongSign, txId });
        }, 'err_notAllowed');
*/

        const entryIdWrongDate = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: moment().subtract(3, 'week').toDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongDate, txId });
        }, 'err_notAllowed');
      });

      it('Can primary auto reconcile when bill serial provided - exact amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -300,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);
        chai.assert.equal(entry.match.confidence, 'primary');
        chai.assert.equal(entry.match.tx.category, 'payment');
        chai.assert.equal(entry.match.tx.amount, 300);
        chai.assert.deepEqual(entry.match.tx.bills, [{ id: billId, amount: 300 }]);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.getPayments()[0].id });
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200);
      });

      xit('Can primary auto reconcile when bill serial provided - rounded lower amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -298,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId);
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 202);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: -2, account: '`99' }],
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
          [{ amount: 298, account: bankAccount.code }],
        );
      });

      xit('Can primary auto reconcile when bill serial provided - rounded higher amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -302,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId);
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200 - 2);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: 2, account: '`99' }],
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
          [{ amount: 302, account: bankAccount.code }],
        );
      });

      it('Can secondary auto reconcile when bills outstandings match - exact amount', function () {
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -500,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);
        chai.assert.equal(entry.match.confidence, 'success');
        chai.assert.equal(entry.match.tx.category, 'payment');
        chai.assert.equal(entry.match.tx.amount, 500);
        chai.assert.deepEqual(entry.match.tx.bills, [{ id: billId, amount: 300 }, { id: billId2, amount: 200 }]);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.getPayments()[0].id });
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 0);
        bill2 = Transactions.findOne(billId2);
        chai.assert.equal(bill2.amount, 200);
        chai.assert.equal(bill2.getPayments().length, 1);
        chai.assert.equal(bill2.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill2.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill2.getPayments()[0].id });
        chai.assert.equal(bill2.partner().outstanding(undefined, 'supplier'), 0);
      });

      it('Can reconcile two payments to one statementEntry', function () {
        const paymentId1 = Fixture.builder.create('payment', { bills: [{ id: billId, amount: 300 }], amount: 300, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount.code });
        const paymentId2 = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 200,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.customer,
          lines: [{ account: '`861', amount: 200 }],
        });
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -500,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId1 });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.isFalse(entry.isReconciled());
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId2 });
        entry = StatementEntries.findOne(entryId);
        chai.assert.isTrue(entry.isReconciled());
        chai.assert.isTrue(Transactions.findOne(paymentId1).reconciled);
        chai.assert.isTrue(Transactions.findOne(paymentId2).reconciled);
      });

      it('Can reconcile payments with different signs to one statementEntry', function () {
        const paymentId1 = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 1000,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 1000 }],
        });
        const paymentId2 = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: -100,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.customer,
          lines: [{ account: '`861', amount: -100 }],
        });
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -900,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId1 });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.isFalse(entry.isReconciled());
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId2 });
        entry = StatementEntries.findOne(entryId);
        chai.assert.isTrue(entry.isReconciled());
        chai.assert.isTrue(Transactions.findOne(paymentId1).reconciled);
        chai.assert.isTrue(Transactions.findOne(paymentId2).reconciled);
      });
    });

    describe('Transfer reconciliation', function () {
      let transferId, seId1, seId2;
      let tx, se1, se2;
      after(function () {
        Transactions.remove({ category: 'transfer' });
      });

      it('Can reconcile a transfer tx to both bank statements', function () {
        const seIdWrongAmount = Fixture.builder.create('statementEntry', {
          account: '`382', amount: -120500,
        });
        seId1 = Fixture.builder.create('statementEntry', {
          account: '`382', amount: 120500,
        });
        seId2 = Fixture.builder.create('statementEntry', {
          account: '`383', amount: -120500,
        });
        transferId = Fixture.builder.create('transfer', {
          toAccount: '`382', fromAccount: '`383', amount: 120500,
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: transferId });

        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: seIdWrongAmount, txId: transferId });
        }, 'err_notAllowed');

        tx = Transactions.findOne(transferId);
        se1 = StatementEntries.findOne(seId1);
        chai.assert.isFalse(tx.reconciled);
        chai.assert.isFalse(se1.isReconciled());

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: seId1, txId: transferId });
        tx = Transactions.findOne(transferId);
        se1 = StatementEntries.findOne(seId1);
        chai.assert.isFalse(tx.reconciled);
        chai.assert.isTrue(se1.isReconciled());

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: seId2, txId: transferId });
        tx = Transactions.findOne(transferId);
        se2 = StatementEntries.findOne(seId2);
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(se2.isReconciled());
      });

      it('Can remove tx and keeps statements in sync', function () {
        Fixture.builder.execute(Transactions.methods.remove, { _id: transferId });
        tx = Transactions.findOne(transferId);
        se1 = StatementEntries.findOne(seId1);
        se2 = StatementEntries.findOne(seId2);
        chai.assert.equal(tx.status, 'void');
        chai.assert.isFalse(se1.isReconciled());
        chai.assert.isFalse(se2.isReconciled());
      });
    });

    describe('Receipt reconciliation', function () {
      let receiptId, seId;
      let tx, se;
      after(function () {
        Transactions.remove({ category: 'receipt' });
      });

      it('Can reconcile a receipt to bank statement', function () {
        seId = Fixture.builder.create('statementEntry', {
          account: '`382', amount: -4560,
        });
        receiptId = Fixture.builder.create('expense', {
          payAccount: '`382',
          amount: 4560,
          lines: [{
            title: 'The Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 4560,
            account: '`5201',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: receiptId });

        tx = Transactions.findOne(receiptId);
        se = StatementEntries.findOne(seId);
        chai.assert.isFalse(tx.reconciled);
        chai.assert.isFalse(se.isReconciled());

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: seId, txId: receiptId });
        tx = Transactions.findOne(receiptId);
        se = StatementEntries.findOne(seId);
        chai.assert.isTrue(tx.reconciled);
        chai.assert.isTrue(se.isReconciled());
      });

      it('Can remove receipt and keeps statement in sync', function () {
        Fixture.builder.execute(Transactions.methods.remove, { _id: receiptId });
        tx = Transactions.findOne(receiptId);
        se = StatementEntries.findOne(seId);
        chai.assert.equal(tx.status, 'void');
        chai.assert.isFalse(se.isReconciled());
      });
    });

    describe('Recognition', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;

      before(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);
      });
      after(function () {
        Transactions.remove({ category: 'payment' });
        Transactions.remove({ category: 'bill' });
      });

      it('Does not recognize Entry without partner', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -300,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.isUndefined(entry.match);
      });
    });

    describe('Machine learning', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;

      before(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);
      });
      after(function () {
        Transactions.remove({ category: 'payment' });
        Transactions.remove({ category: 'bill' });
      });

      it('[1] Entry has unknown partner name - will not be auto reconciled', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'SUPPLIER INC - Official name',
          amount: -300,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.isUndefined(entry.match);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 0);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.outstanding, 300);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 500);
      });

      it('[2] ... but can be reconciled by hand', function () {
        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          bills: [{ id: billId, amount: 300 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 1);

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: paymentId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding(undefined, 'supplier'), 200);
      });

      it('[3] Next enrty with same partnerName - will be recognized', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'SUPPLIER INC - Official name',
          amount: -200,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'success');

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 2);

        bill2 = Transactions.findOne(billId2);
        chai.assert.equal(bill2.amount, 200);
        chai.assert.equal(bill2.getPayments().length, 1);
        chai.assert.equal(bill2.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill2.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill2.getPayments()[0].id });
        chai.assert.equal(bill2.partner().outstanding(undefined, 'supplier'), 0);
      });

      it('Partner name containing dots can be saved and recognized', function () { 
        const billId3 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'Next Work',
            uom: 'piece',
            quantity: 1,
            unitPrice: 500,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId3 });
        const entryId3 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier.Inc.',
          amount: -100,
        });
        const paymentId3 = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 100,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          bills: [{ id: billId3, amount: 100 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId3 });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 3);

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId3, txId: paymentId3 });
        const entry = StatementEntries.findOne(entryId3);
        chai.assert.equal(entry.isReconciled(), true);
        let bill3 = Transactions.findOne(billId3);
        chai.assert.equal(bill3.amount, 500);
        chai.assert.equal(bill3.getPayments().length, 1);
        chai.assert.equal(bill3.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill3.outstanding, 400);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill3.getPayments()[0].id });
        chai.assert.equal(bill3.partner().outstanding(undefined, 'supplier'), 400);

        const entryId4 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier.Inc.',
          amount: -100,
        });
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId4 });
        const entry4 = StatementEntries.findOne(entryId4);
        chai.assert.equal(entry4.match.confidence, 'info');

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId4 });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 4);
        bill3 = Transactions.findOne(billId3);
        chai.assert.equal(bill3.amount, 500);
        chai.assert.equal(bill3.getPayments().length, 2);
        chai.assert.equal(bill3.getPaymentTransactions()[0].reconciled, true);
        chai.assert.equal(bill3.outstanding, 300);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill3.getPayments()[1].id });
        chai.assert.equal(bill3.partner().outstanding(undefined, 'supplier'), 300);
      });

      it('Recognition deals with different signs', function () {
        const billId4 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'Refund',
            uom: 'piece',
            quantity: 1,
            unitPrice: -40,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId4 });
        let bill4 = Transactions.findOne(billId4);
        chai.assert.equal(bill4.partner().outstanding(undefined, 'supplier'), 260);

        const entryId5 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier.Inc.',
          amount: 40,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId5 });
        const entry5 = StatementEntries.findOne(entryId5);
        chai.assert.equal(entry5.match.confidence, 'warning');
        chai.assert.equal(entry5.match.tx.lines.length, 0);
        chai.assert.equal(entry5.match.tx.bills.length, 0);

        const entryId6 = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          name: 'Supplier.Inc.',
          amount: -280,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId6 });
        const entry6 = StatementEntries.findOne(entryId6);
        chai.assert.equal(entry6.match.confidence, 'info');
        chai.assert.equal(entry6.match.tx.lines.length, 0);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId6 });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 5);
        const bill3 = Transactions.findOne({ category: 'bill', 'lines.0.title': 'Next Work' });
        bill4 = Transactions.findOne(billId4);
        chai.assert.equal(bill3.amount, 500);
        chai.assert.equal(bill3.getPayments().length, 3);
        chai.assert.equal(bill3.outstanding, 0);
        chai.assert.equal(bill4.amount, -40);
        chai.assert.equal(bill4.getPayments().length, 1);
        chai.assert.equal(bill4.outstanding, 0);

        Fixture.builder.execute(Transactions.methods.post, { _id: bill3.getPayments()[2].id });
        Fixture.builder.execute(Transactions.methods.post, { _id: bill4.getPayments()[0].id });
        chai.assert.equal(bill3.partner().outstanding(undefined, 'supplier'), -20);
      });

      it('[1] Entry has unknown bank account number - will not be auto reconciled', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: '`382',
          contraBAN: '1234-5678',
          valueDate: Clock.currentDate(),
          amount: -300,
        });
        let entry = StatementEntries.findOne(entryId);
        let bankAccountDoc = Accounts.findOneT({ communityId: entry.communityId, code: '`383' });

        chai.assert.isUndefined(bankAccountDoc.BAN);
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.isUndefined(entry.match);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'transfer' }).count(), 0);

        Fixture.builder.execute(Accounts.methods.update, { _id: bankAccountDoc._id, modifier: { $set: { BAN: 'IBAN-1234-5678', communityId: Fixture.demoCommunityId } } }, Fixture.demoAccountantId);
        bankAccountDoc = Accounts.findOneT({ communityId: entry.communityId, code: '`383' });
        chai.assert.equal(bankAccountDoc.BAN, 'IBAN-1234-5678');
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.isUndefined(entry.match);
      });

      it('[2] ... but can be reconciled by hand', function () {
        const transferId = Fixture.builder.create('transfer', {
          amount: 300,
          valueDate: Clock.currentDate(),
          toAccount: '`383',
          fromAccount: '`382',
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: transferId });
        chai.assert.equal(Transactions.find({ category: 'transfer' }).count(), 1);

        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: transferId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
      });

      it('[2.5] ... as the other side of the transfer as well', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: '`383',
          contraBAN: '4321-8765',
          valueDate: Clock.currentDate(),
          amount: 300,
        });
        let entry = StatementEntries.findOne(entryId);
        const bankAccountDoc = Accounts.findOneT({ communityId: entry.communityId, code: '`382' });
        Fixture.builder.execute(Accounts.methods.update, { _id: bankAccountDoc._id, modifier: { $set: { BAN: 'IBAN-4321-8765', communityId: Fixture.demoCommunityId } } }, Fixture.demoAccountantId);
        const transferId = Transactions.findOne({ category: 'transfer' })._id;
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId, txId: transferId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), true);
        chai.assert.equal(Transactions.find({ category: 'transfer' }).count(), 1);
      });

      it('[3] Next enrty with same BAN - will be recognized', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: '`382',
          contraBAN: '1234-5678',
          valueDate: Clock.currentDate(),
          amount: -500,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match?.confidence, 'success');
        chai.assert.equal(entry.match?.tx?.category, 'transfer');
        chai.assert.equal(entry.match?.tx?.amount, 500);
        chai.assert.equal(entry.match?.tx?.toAccount, '`383');
        chai.assert.equal(entry.match?.tx?.fromAccount, '`382');

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'transfer' }).count(), 2);
      });

      it('[3.5] ... as the other side of transfer will be recognized', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: '`383',
          contraBAN: '4321-8765',
          valueDate: Clock.currentDate(),
          amount: 500,
        });
        const transferId = Transactions.findOne({ category: 'transfer', amount: 500 })._id;
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'success');
        chai.assert.equal(entry.match.txId, transferId);
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.txId, transferId);
      });
    });

    describe('Recognition with paymentsWoStatement setting', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;

      before(function () {
        Communities.update({ _id: Fixture.demoCommunityId }, { $set: { 'settings.paymentsWoStatement': true } });
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
        Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        bill = Transactions.findOne(billId);

        billId2 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
          relationAccount: '`454',
          lines: [{
            title: 'The Work A',
            uom: 'piece',
            quantity: 1,
            unitPrice: 50,
            account: '`861',
            localizer: '@',
          }, {
            title: 'The Work B',
            uom: 'piece',
            quantity: 1,
            unitPrice: 150,
            account: '`861',
            localizer: '@',
          }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: billId2 });
        bill2 = Transactions.findOne(billId2);
      });
      after(function () {
        Transactions.remove({ category: 'payment' });
        Transactions.remove({ category: 'bill' });
      });

      it('Gives tx suggestion if no matching payment exists', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -200,
          note: bill2.serialId,
        });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 0);
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'primary');
        chai.assert.deepEqual(entry.match.tx.bills[0], { id: billId2, amount: 200 });
      });

      it('Matches entry with payment by amount and valueDate', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -300,
        });
        const firstPaymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 200,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 200 }],
        });
        const secondPaymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.date(1, 'week', 'ago'),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 300 }],
        });
        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 300 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: firstPaymentId });
        Fixture.builder.execute(Transactions.methods.post, { _id: secondPaymentId });
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 3);
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.txId, paymentId);
        chai.assert.equal(entry.match.confidence, 'info');
      });

      it("With more possible matches confidence is 'warning'", function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -200,
        });
        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 200,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 200 }],
        });
        const matchingPayments = Transactions.find({ category: 'payment', amount: 200, valueDate: Clock.currentDate() }).fetch();
        chai.assert.equal(matchingPayments.length, 2);
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'warning');
        chai.assert.include([matchingPayments[0]._id, matchingPayments[1]._id], entry.match.txId);
      });

      it("Matches entry with payment by bill's serialId", function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.date(1, 'week', 'ago'),
          amount: -300,
          note: `Payment for ${bill.serialId} for other partner`,
        });

        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.date(1, 'week', 'ago'),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          bills: [{ id: billId, amount: 300 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(Transactions.find({ category: 'payment', amount: 300, valueDate: Clock.date(1, 'week', 'ago') }).count(), 2);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.txId, paymentId);
        chai.assert.equal(entry.match.confidence, 'primary');
        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
      });

      it('Can match by recognized partner', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.currentDate(),
          amount: -500,
          name: 'Supplier Inc',
        });
        const firstPaymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 500,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.customer,
          lines: [{ account: '`861', amount: 500 }],
        });
        const secondPaymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 500,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.supplier,
          lines: [{ account: '`861', amount: 500 }],
        });
        const thirdPaymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 500,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount.code,
          partnerId: Fixture.partnerId(Fixture.demoUserId),
          lines: [{ account: '`861', amount: 500 }],
        });
        Fixture.builder.execute(Transactions.methods.post, { _id: firstPaymentId });
        Fixture.builder.execute(Transactions.methods.post, { _id: secondPaymentId });
        Fixture.builder.execute(Transactions.methods.post, { _id: thirdPaymentId });
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.txId, secondPaymentId);
        chai.assert.equal(entry.match.confidence, 'info');
      });

      it('Does not match again for a reconciled payment by serialId', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount.code,
          valueDate: Clock.date(1, 'week', 'ago'),
          amount: -300,
          note: `Payment for ${bill.serialId} for other partner`,
        });
        const payment = Transactions.findOne({ category: 'payment', 'bills.0.id': billId });
        chai.assert.isDefined(payment);
        chai.assert.isTrue(payment.reconciled);

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.notEqual(entry.match.txId, payment._id);
        chai.assert.equal(entry.match.confidence, 'info');
      });

      // this test depends on recognitions saved in 'Machine learning' tests above
      it('Recognizes transfer', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: '`382',
          contraBAN: '1234-5678',
          valueDate: Clock.currentDate(),
          amount: -300,
        });
        const transferId = Fixture.builder.create('transfer', {
          defId: Txdefs.getByName('Money transfer', Fixture.demoCommunityId)._id,
          amount: 300,
          valueDate: Clock.currentDate(),
          toAccount: '`383',
          fromAccount: '`382',
        });
//        Fixture.builder.execute(Transactions.methods.post, { _id: transferId });
        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.txId, transferId);
        chai.assert.equal(entry.match.confidence, 'success');
      });
    });
  });
}
