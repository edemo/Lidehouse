/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';


if (Meteor.isServer) {
  let FixtureA; //, FixtureC;

  describe('transactions', function () {
    this.timeout(15000);
    before(function () {
//      FixtureC = freshFixture('Cash accounting house');
      FixtureA = freshFixture();
      Communities.update(FixtureA.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
    });
    after(function () {
    });

    describe('Bills api', function () {
      let billId;
      let bill;
      before(function () {
        const partnerId = FixtureA.partnerId(FixtureA.dummyUsers[1]);
        billId = FixtureA.builder.create('bill', {
          relation: 'member',
          partnerId,
          contractId: Contracts.findOne({ partnerId })?._id,
          issueDate: new Date('2018-01-05'),
          deliveryDate: new Date('2018-01-02'),
          dueDate: new Date('2018-01-30'),
          lines: [{
            title: 'Work 1',
            uom: 'piece',
            quantity: 1,
            unitPrice: 300,
            localizer: '@AP01',
            parcelId: FixtureA.dummyParcels[1],
          }, {
            title: 'Work 2',
            uom: 'month',
            quantity: 2,
            unitPrice: 500,
            localizer: '@AP02',
            parcelId: FixtureA.dummyParcels[2],
          }],
        });
      });
      after(function () {
        Transactions.remove(billId);
      });

      it('Fills calculated values correctly', function () {
        bill = Transactions.findOne(billId);

        chai.assert.equal(bill.lines.length, 2);
        chai.assert.equal(bill.lines[0].amount, 300);
        chai.assert.equal(bill.lines[1].amount, 1000);
        chai.assert.equal(bill.amount, 1300);
        chai.assert.equal(bill.valueDate.getTime(), bill.deliveryDate.getTime());
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);

        chai.assert.equal(bill.outstanding, 1300);
        chai.assert.equal(bill.partner().outstanding, 1300);
//        chai.assert.equal(bill.contract().outstanding, 1300);
        const parcel1 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP01' });
        const parcel2 = Parcels.findOne({ communityId: FixtureA.demoCommunityId, ref: 'AP02' });
        chai.assert.equal(parcel1.outstanding, 300);
        chai.assert.equal(parcel2.outstanding, 1000);
      });
    });

    describe('Bills lifecycle with accrual method', function () {
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

      it('Can create without accounts', function () {
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 0);
        chai.assert.equal(bill.isPosted(), false);

        chai.assert.equal(bill.outstanding, 300);
        chai.assert.equal(bill.partner().outstanding, 300);
      });

      it('Can not post without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.execute(Transactions.methods.post, { _id: billId });
        }, 'Bill has to be conteered first');
      });

      it('Can not registerPayment without accounts', function () {
        chai.assert.throws(() => {
          FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 300 }], amount: 300, valueDate: Clock.currentTime() });
        }, 'Bill has to be conteered first');
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
      });

      it('Can register Payments', function () {
        const bankAccount = '`381';
        const paymentId1 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 100 }], amount: 100, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 1);
        chai.assert.equal(bill.outstanding, 200);
        chai.assert.equal(bill.partner().outstanding, 200);

        const paymentId2 = FixtureA.builder.create('payment', { bills: [{ id: billId, amount: 200 }], amount: 200, valueDate: Clock.currentTime(), payAccount: bankAccount });
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.amount, 300);
        chai.assert.equal(bill.getPayments().length, 2);
        chai.assert.equal(bill.outstanding, 0);
        chai.assert.equal(bill.partner().outstanding, 0);

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

        FixtureA.builder.execute(Transactions.methods.post, { _id: paymentId2 });
        tx2 = Transactions.findOne(paymentId2);
        chai.assert.isTrue(tx2.isPosted());
        chai.assert.deepEqual(tx2.debit, [{ amount: 200, account: '`454', localizer: '@' }]);
        chai.assert.deepEqual(tx2.credit, [{ amount: 200, account: bankAccount }]);
      });

      it('Can storno a Payment', function () {
        let payment1 = Transactions.findOne({ category: 'payment', amount: 100 });
        FixtureA.builder.execute(Transactions.methods.remove, { _id: payment1._id });

        payment1 = Transactions.findOne(payment1._id);
        chai.assert.equal(payment1.status, 'void');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 100);
      });

      it('Can amend a Payment', function () {
        let payment2 = Transactions.findOne({ category: 'payment', amount: 200 });
        FixtureA.builder.execute(Transactions.methods.update, { _id: payment2._id, modifier: { $set: {
          bills: [{ id: billId, amount: 180 }],
          lines: [{ account: '`88', amount: 20 }],
        } } });

        payment2 = Transactions.findOne(payment2._id);
        chai.assert.equal(payment2.status, 'posted');
        bill = Transactions.findOne(billId);
        chai.assert.equal(bill.outstanding, 120);
      });
    });
  });
}
