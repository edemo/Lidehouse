/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';


if (Meteor.isServer) {
  let Fixture;

  describe('reconciliation', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      Fixture = freshFixture();
    });
    after(function () {
    });

    describe('Bills payments reconciliation', function () {
      let billId, billId2;
      let bill, bill2;
//      let statementId;
      const bankAccount = '`381';

      beforeEach(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
          account: bankAccount,
          startDate: moment().subtract(1, 'month').toDate(),
          endDate: new Date(),
          startBalance: 0,
          endBalance: 100,
        });
*/
      });
      afterEach(function () {
        Transactions.remove({ category: 'payment' });
        Transactions.remove({ category: 'bill' });
      });

      it('Can pay bill by registering a payment tx - later a statementEntry will be matched to it', function () {
        const paymentId = Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 200);
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId });
        chai.assert.equal(bill.partner().outstanding(), -200 - 200);

        const txId1 = bill.getPayments()[0].id;
        const entryId1 = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId1, txId: txId1 });

        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding(), -200 - 200);

        const paymentId2 = Fixture.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), false);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        chai.assert.equal(bill.partner().outstanding(), -200 - 0);

        const txId2 = bill.getPayments()[1].id;
        const entryId2 = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -200,
        });
        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2, txId: txId2 });
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.getPaymentTransactions()[1].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding(), -200 - 0);
      });

      it('Can NOT reconcile statementEntry with different relation, amount or date', function () {
        Fixture.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, relation: bill.relation, partnerId: bill.partnerId, valueDate: Clock.currentDate(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        const txId = bill.getPayments()[0].id;
/*        
        const entryIdWrongRelation = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Customer Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongRelation, txId });
        }, 'err_notAllowed');
*/
        const entryIdWrongAccount = Fixture.builder.create('statementEntry', {
          account: bankAccount + '1',
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAccount, txId });
        }, 'err_notAllowed');

        const entryIdWrongAmount = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: -110,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongAmount, txId });
        }, 'err_notAllowed');

        const entryIdWrongSign = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          amount: 100,
        });
        chai.assert.throws(() => {
          Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryIdWrongSign, txId });
        }, 'err_notAllowed');

        const entryIdWrongDate = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier Inc',
          note: bill.serialId,
          amount: -300,
        });
        let entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.isReconciled(), false);

//        Fixture.builder.execute(StatementEntries.methods.reconcile, { _id: entryId2 });
//        entry2 = StatementEntries.findOne(entryId2);
//        chai.assert.equal(entry2.match.billId, billId);
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
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.getPayments()[0].id });
        chai.assert.equal(bill.partner().outstanding(), -200);
      });

      xit('Can primary auto reconcile when bill serial provided - rounded lower amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId);
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.equal(bill.partner().outstanding(), -202);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: -2, account: '`99' }],
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
          [{ amount: 298, account: '`381' }],
        );
      });

      xit('Can primary auto reconcile when bill serial provided - rounded higher amount', function () {
        chai.assert.isTrue(!!bill.serialId);
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);

        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), false);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.payments[0].id }, Fixture.demoAccountantId);
        chai.assert.equal(bill.getPaymentTransactions()[0].isPosted(), true);
        chai.assert.equal(bill.partner().outstanding(), -200 + 2);
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].debit,
          [{ amount: 300, account: '`454', localizer: '@' }, { amount: 2, account: '`99' }],
        );
        chai.assert.deepEqual(
          bill.getPaymentTransactions()[0].credit,
          [{ amount: 302, account: '`381' }],
        );
      });

      it('Can secondary auto reconcile when bills outstandings match - exact amount', function () {
        const entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill.getPayments()[0].id });
        chai.assert.equal(bill.partner().outstanding(), 0);
        bill2 = Transactions.findOne(billId2);
        chai.assert.equal(bill2.amount, 200);
        chai.assert.equal(bill2.getPayments().length, 1);
        chai.assert.equal(bill2.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill2.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill2.getPayments()[0].id });
        chai.assert.equal(bill2.partner().outstanding(), 0);
      });
    });

    describe('Recognition', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;
      const bankAccount = '`381';

      before(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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

      it('Handles Entry without partner', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
          valueDate: Clock.currentDate(),
          amount: -300,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'danger');
        chai.assert.isUndefined(entry.match.tx.category);
        chai.assert.isUndefined(entry.match.tx.defId);
        chai.assert.equal(entry.match.tx.amount, 300);
      });
    });

    describe('Machine learning', function () {
      let billId, billId2;
      let bill, bill2;
      let entryId, entryId2;
      const bankAccount = '`381';

      before(function () {
        billId = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'SUPPLIER INC - Official name',
          amount: -300,
        });

        Fixture.builder.execute(StatementEntries.methods.recognize, { _id: entryId });
        const entry = StatementEntries.findOne(entryId);
        chai.assert.equal(entry.match.confidence, 'danger');
        chai.assert.isUndefined(entry.match.tx.category);
        chai.assert.equal(entry.match.tx.amount, 300);

        Fixture.builder.execute(StatementEntries.methods.autoReconcile, { _id: entryId });
        chai.assert.equal(Transactions.find({ category: 'payment' }).count(), 0);
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.outstanding, 300);
        chai.assert.equal(bill.partner().outstanding(), -500);
      });

      it('[2] ... but can be reconciled by hand', function () {
        const paymentId = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 300,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount,
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
        chai.assert.equal(bill.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding(), -200);
      });

      it('[3] Next enrty with same partnerName - will be recognized', function () {
        entryId = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
        chai.assert.equal(bill2.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill2.outstanding, 0);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill2.getPayments()[0].id });
        chai.assert.equal(bill2.partner().outstanding(), 0);
      });

      it('Partner name containing dots can be saved and recognized', function () { 
        const billId3 = Fixture.builder.create('bill', {
          relation: 'supplier',
          partnerId: Fixture.supplier,
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
          account: bankAccount,
          valueDate: Clock.currentDate(),
          name: 'Supplier.Inc.',
          amount: -100,
        });
        const paymentId3 = Fixture.builder.create('payment', {
          relation: 'supplier',
          amount: 100,
          valueDate: Clock.currentDate(),
          payAccount: bankAccount,
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
        chai.assert.equal(bill3.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill3.outstanding, 400);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill3.getPayments()[0].id });
        chai.assert.equal(bill3.partner().outstanding(), -400);

        const entryId4 = Fixture.builder.create('statementEntry', {
          account: bankAccount,
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
        chai.assert.equal(bill3.getPaymentTransactions()[0].isReconciled(), true);
        chai.assert.equal(bill3.outstanding, 300);
        Fixture.builder.execute(Transactions.methods.post, { _id: bill3.getPayments()[1].id });
        chai.assert.equal(bill3.partner().outstanding(), -300);
      });
    });
  });
}
