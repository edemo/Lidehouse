/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/methods.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Partners } from '/imports/api/partners/partners';
import { Balances } from './balances';

if (Meteor.isServer) {
  let Fixture;

  describe('balances', function () {
    this.timeout(15000);
    let originalAccountToLocalize;
    let insertTx;
    let assertBalance;
    before(function () {
      Fixture = freshFixture();
      originalAccountToLocalize = Accounts.toLocalize;
      Accounts.toLocalize = () => ['`1'];
      Templates.remove({});
      Accounts.remove({});
      Transactions.remove({});
      Templates.define({ _id: 'Test_COA', accounts: [
        { code: '`', name: 'COA', category: 'technical' },
        { code: '`1', name: 'Level1', category: 'payable' },
        { code: '`12', name: 'Level2', category: 'payable' },
        { code: '`12A', name: 'LeafA', category: 'payable' },
        { code: '`12B', name: 'LeafB', category: 'payable' },
        { code: '`12C', name: 'LeafC', category: 'payable' },
        { code: '`19', name: 'LeafD', category: 'payable' },
      ],
      });
      Templates.clone('Test_COA', Fixture.demoCommunityId);
      insertTx = function (params) {
        const communityId = Fixture.demoCommunityId;
        const _id = Transactions.methods.insert._execute({ userId: Fixture.demoAccountantId }, {
          communityId,
          category: 'freeTx',
          defId: Txdefs.findOne({ communityId, category: 'freeTx' })._id,
          valueDate: params.valueDate,
          amount: params.amount,
          postedAt: params.postedAt,
          credit: [{
            account: params.credit[0],
            localizer: params.credit[1],
          }],
          debit: [{
            account: params.debit[0],
            localizer: params.debit[1],
          }],
        });
        return _id;
      };
      assertBalance = function (account, localizer, tag, expectedBalance) {
        const balance = Balances.get({
          communityId: Fixture.demoCommunityId,
          account,
          localizer,
          tag,
        }).total();
        chai.assert.equal(balance, expectedBalance);
      };
    });
    after(function () {
      Accounts.toLocalize = originalAccountToLocalize;
    });

    describe('api', function () {
      afterEach(function () {
        Transactions.remove({});
      });

      after(function () {
        Balances.remove({});
      });

      // Testing only freeTx category, post method with other categories are tested elsewhere e.g. parcel-billings.tests
      it('updates balances with tx operations', function (done) {
        Clock.setSimulatedTime(new Date('2017-02-02'));
        insertTx({
          valueDate: new Date('2017-01-01'),
          amount: 1000,
          postedAt: new Date('2017-01-04'),  // inserting as already posted
          credit: ['`12A'],
          debit: ['`19'],
        });
        assertBalance('`12A', undefined, 'T', -1000);
        assertBalance('`12A', undefined, 'T-2017', -1000);
        assertBalance('`12A', undefined, 'T-2017-01', -1000);
        assertBalance('`12A', undefined, 'T-2017-02', 0);
        assertBalance('`12', undefined, 'T-2017-01', -1000);
        assertBalance('`1', undefined, 'T-2017-01', 0);
        assertBalance('`19', undefined, 'T', 1000);

        const _id = insertTx({
          valueDate: new Date('2017-02-02'),
          amount: 1500,
          credit: ['`12A'],
          debit: ['`19'],
        });
        assertBalance('`12A', undefined, 'T-2017-02', 0);
        assertBalance('`12A', undefined, 'T-2017', -1000);
        assertBalance('`1', undefined, 'T-2017', 0);
        assertBalance('`19', undefined, 'T', 1000);

        Transactions.methods.update._execute({ userId: Fixture.demoAccountantId }, { _id,  modifier: { $set: { amount: 2000 } } });
        assertBalance('`12A', undefined, 'T-2017-02', 0);
        assertBalance('`12A', undefined, 'T-2017', -1000);
        assertBalance('`1', undefined, 'T-2017', 0);
        assertBalance('`19', undefined, 'T', 1000);

        Transactions.methods.post._execute({ userId: Fixture.demoAccountantId }, { _id });
        assertBalance('`12A', undefined, 'T', -3000);
        assertBalance('`12A', undefined, 'T-2017', -3000);
        assertBalance('`12A', undefined, 'T-2017-01', -1000);
        assertBalance('`12A', undefined, 'T-2017-02', -2000);
        assertBalance('`12', undefined, 'T-2017-01', -1000);
        assertBalance('`12', undefined, 'T-2017-02', -2000);
        assertBalance('`1', undefined, 'T-2017-01', 0);
        assertBalance('`1', undefined, 'T-2017-02', 0);
        assertBalance('`1', undefined, 'T-2017', 0);
        assertBalance('`19', undefined, 'T', 3000);

        Transactions.remove(_id);
        // copy of the previous test's end state
        assertBalance('`12A', undefined, 'T', -1000);
        assertBalance('`12A', undefined, 'T-2017', -1000);
        assertBalance('`12A', undefined, 'T-2017-01', -1000);
        assertBalance('`12A', undefined, 'T-2017-02', 0);
        assertBalance('`12', undefined, 'T-2017-01', -1000);
        assertBalance('`12', undefined, 'T-2017-02', 0);
        assertBalance('`1', undefined, 'T-2017-01', 0);
        assertBalance('`19', undefined, 'T', 1000);

        Clock.clear();
        done();
      });

      it('updates balances of localizer', function (done) {
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          postedAt: new Date(),
          credit: ['`12B', '@A103'],
          debit: ['`12C'],
        });
        assertBalance('`12B', '@A103', 'T', -500);
        assertBalance('`12B', '@A103', 'T-2017', -500);
        assertBalance('`12B', '@A1', 'T', -500); // upward cascading localizer
        assertBalance('`12B', '@A', 'T', -500);
        assertBalance('`12B', '@A', 'T-2017', -500);
        assertBalance('`12B', undefined, 'T', -500); // non-localized main account is also updated
        assertBalance('`12C', '@A103', 'T', 0);      // non-existing localized account answers with 0
        assertBalance('`12C', undefined, 'T', 500);
        assertBalance('`12', undefined, 'T', 0);
        assertBalance('`12', '@A103', 'T', -500);  // localized parent account not allowed (for now)
        assertBalance('`1', undefined, 'T', 0);
        assertBalance('`1', '@A103', 'T', -500);

        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          postedAt: new Date(),
          credit: ['`12C', '@A103'],
          debit: ['`12B'],
        });
        assertBalance('`12C', undefined, 'T', 0);
        assertBalance('`12C', '@A103', 'T', -500);
        done();
      });

      it('updates balances of both account and localizer', function (done) {
        const txId = insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 600,
          credit: ['`12A', '@A103'],
          debit: ['`12B', '@A104'],
        });
        Transactions.direct.update(txId, { $set: { postedAt: new Date() } });
        Transactions.findOne(txId).updateBalances();
        assertBalance('`12A', '@A103', 'T', -600);
        assertBalance('`12B', '@A104', 'T', 600);
        assertBalance('`12A', '@A', 'T', -600);
        assertBalance('`12B', '@A', 'T', 600);
        assertBalance('`1', '@', 'T', 0);

        Transactions.findOne(txId).updateBalances(-1);
        assertBalance('`12A', '@A103', 'T', 0);
        assertBalance('`12B', '@A104', 'T', 0);
        assertBalance('`1', '@', 'T', 0);
        done();
      });
    });

    describe('calculations for certain date', function () {
      let simpleInsertTx;
      before(function () {
        simpleInsertTx = function (date, amount, credit, debit) {
          return insertTx({ valueDate: new Date(date), postedAt: new Date(date), amount, credit: [credit], debit: [debit] });
        };
      });
      after(function() {
        Balances.remove();
        Transactions.remove();
      });

      it('calculates opening/closing values right', function () {
        simpleInsertTx('2019-01-05', 100, '`12A', '`19');
        simpleInsertTx('2019-01-30', 500, '`12A', '`19');
        simpleInsertTx('2019-03-01', 900, '`19', '`12A');
        simpleInsertTx('2019-04-05', 1000, '`12A', '`19');
        simpleInsertTx('2020-01-06', 2000, '`12A', '`19');
        simpleInsertTx('2020-01-24', 50, '`12A', '`19');
        simpleInsertTx('2020-02-05', 200, '`12B', '`19');
        simpleInsertTx('2020-02-05', 70, '`19', '`12A');
        assertBalance('`12A', undefined, 'T', -2680);
        assertBalance('`12A', undefined, 'T-2019', -700);
        assertBalance('`12A', undefined, 'T-2019-01', -600);
        assertBalance('`19', undefined, 'T', 2880);
        assertBalance('`19', undefined, 'T-2020', 2180);
        assertBalance('`19', undefined, 'T-2020-01', 2050);
        const openingValue = function (account, tag) {
          return Balances.get({ communityId: Fixture.demoCommunityId, account, tag }, 'opening').total();
        };
        const closingValue = function (account, tag) {
          return Balances.get({ communityId: Fixture.demoCommunityId, account, tag }, 'closing').total();
        };
        chai.assert.equal(closingValue('`12A', 'T-2018'), 0);
        chai.assert.equal(closingValue('`12A', 'T-2019-01'), -600);
        chai.assert.equal(closingValue('`12A', 'T-2019-05'), -700);
        chai.assert.equal(closingValue('`12A', 'T-2019-12'), -700);
        chai.assert.equal(closingValue('`12A', 'T-2019'), -700);
        chai.assert.equal(closingValue('`12A', 'T-2020-01'), -2750);
        chai.assert.equal(closingValue('`12A', 'T-2020-02'), -2680);
        chai.assert.equal(closingValue('`12B', 'T-2020-01'), 0);
        chai.assert.equal(closingValue('`12B', 'T-2020-02'), -200);
        chai.assert.equal(closingValue('`12', 'T-2019-01'), -600);
        chai.assert.equal(closingValue('`12', 'T-2020-03'), -2880);
        chai.assert.equal(closingValue('`1', 'T-2019-01'), 0);
        chai.assert.equal(closingValue('`19', 'T-2019-01'), 600);
        chai.assert.equal(closingValue('`19', 'T-2019-03'), -300);
        chai.assert.equal(closingValue('`19', 'T-2019-12'), 700);
        chai.assert.equal(closingValue('`19', 'T-2020-01'), 2750);
        chai.assert.equal(closingValue('`19', 'T-2020-03'), 2880);

        chai.assert.equal(openingValue('`12A', 'T-2018'), 0);
        chai.assert.equal(openingValue('`12A', 'T-2019'), 0);
        chai.assert.equal(openingValue('`12A', 'T-2019-01'), 0);
        chai.assert.equal(openingValue('`12A', 'T-2019-02'), -600);
        chai.assert.equal(openingValue('`12A', 'T-2019-12'), -700);
        chai.assert.equal(openingValue('`12A', 'T-2020'), -700);
      });
      it('finds existing C balance', function () {
        Balances.insert({
          communityId: Fixture.demoCommunityId,
          account: '`12C',
          tag: 'C-2019-03',
          debit: 12000,
          credit: 4000,
        });
        chai.assert.equal(Balances.getClosingValue({ communityId: Fixture.demoCommunityId, account: '`12C', tag: 'T-2019-03' }).total(), 8000);
      });
      it('throws if closing date is not the end of month', function () {
        chai.assert.equal(Balances.getClosingValue({ communityId: Fixture.demoCommunityId, account: '`12A', tag: 'T-2019-03-31' }).total(), 300);
        chai.assert.throws(() => {
          Balances.getClosingValue({ communityId: Fixture.demoCommunityId, account: '`12A', tag: 'T-2019-03-30' });
        }, 'Debug assertion failed');
      });
      xit('throws if opening date is not the beginning of month', function () {
        chai.assert.equal(Balances.getOpeningValue({ communityId: Fixture.demoCommunityId, account: '`12A', tag: 'T-2019-02-01' }).total(), -600);
        chai.assert.throws(() => {
          Balances.getOpeningValue({ communityId: Fixture.demoCommunityId, account: '`12A', tag: 'T-2019-02-03' });
        }, 'Debug assertion failed');
      });

      it('calculates closing values right for partners', function () {
        function insertPartnerBill(params) {
          const txId = Fixture.builder.create('freeTx', {
            communityId: Fixture.demoCommunityId,
            defId: Txdefs.findOne({ communityId: Fixture.demoCommunityId, category: 'freeTx' })._id,
            valueDate: new Date(params.date),
            amount: params.amount,
            debit: [{
              amount: params.amount,
              account: '`12',
            }],
            credit: [{
              amount: params.amount,
              account: '`19',
              partner: Partners.code(params.partnerId, params.contractId),
            }],
          });
          Transactions.methods.post._execute({ userId: Fixture.demoAccountantId }, { _id: txId });
        }
        function assertPartnerBalance(partner, tag, expectedBalance) {
          const balance = Balances.get({
            communityId: Fixture.demoCommunityId,
            partner,
            tag,
          }).total();
          chai.assert.equal(balance, expectedBalance);
        }
        const partnerId = 'WfS8p9zKdSHFJcewK';
        const contractId = 'ksR6hAc8C9Bc2F8qr';
        const secondContractId = 'k9a9RPCnrZaWjWF2L';
        const otherPartnerId = 'sTrbEGKKBMeaWaysZ';
        const otherContractId = 'vZ3vfc86Edg83SYvf';
        const partnercontract1 = Partners.code(partnerId, contractId);
        const partnercontract2 = Partners.code(partnerId, secondContractId);
        const otherPartnercontract = Partners.code(otherPartnerId, otherContractId);

        insertPartnerBill({ partnerId, contractId, date: '2018-07-05', amount: 100 });
        insertPartnerBill({ partnerId, contractId, date: '2018-09-05', amount: 200 });
        insertPartnerBill({ partnerId, contractId, date: '2019-01-05', amount: 400 });
        insertPartnerBill({ partnerId, contractId, date: '2019-03-05', amount: 600 });
        insertPartnerBill({ partnerId, contractId, date: '2019-07-05', amount: -500 });
        insertPartnerBill({ partnerId, contractId, date: '2019-12-31', amount: -250 });
        insertPartnerBill({ partnerId, contractId, date: '2020-04-05', amount: 900 });
        insertPartnerBill({ partnerId, contractId, date: '2020-09-05', amount: -50 });
        insertPartnerBill({ partnerId, contractId: secondContractId, date: '2019-07-05', amount: 1000 });
        insertPartnerBill({ partnerId, contractId: secondContractId, date: '2019-09-05', amount: 2000 });
        insertPartnerBill({ partnerId, contractId: secondContractId, date: '2020-09-05', amount: 4000 });
        insertPartnerBill({ partnerId: otherPartnerId, contractId: otherContractId, date: '2020-04-05', amount: 750 });
        insertPartnerBill({ partnerId: otherPartnerId, contractId: otherContractId, date: '2020-09-05', amount: -40 });

        assertPartnerBalance(partnercontract1, 'T-2018', -300);
        assertPartnerBalance(partnercontract1, 'T-2019', -250);
        assertPartnerBalance(partnercontract1, 'T-2020', -850);
        assertPartnerBalance(partnercontract2, 'T-2020', -4000);
        assertPartnerBalance(otherPartnercontract, 'T-2020', -710);
        assertPartnerBalance(partnerId, 'T', -8400);

        const openingValue = function (partner, tag) {
          return Balances.get({ communityId: Fixture.demoCommunityId, partner, tag }, 'opening').total();
        };
        const closingValue = function (partner, tag) {
          return Balances.get({ communityId: Fixture.demoCommunityId, partner, tag }, 'closing').total();
        };
        chai.assert.equal(closingValue(partnercontract1, 'T-2018-12'), -300);
        chai.assert.equal(closingValue(partnercontract1, 'T-2019-12'), -550);
        chai.assert.equal(closingValue(partnercontract1, 'T-2020-12'), -1400);
        chai.assert.equal(closingValue(partnercontract1, 'T-2021-12'), -1400);
        chai.assert.equal(closingValue(partnercontract2, 'T-2018-12'), 0);
        chai.assert.equal(closingValue(partnercontract2, 'T-2019-12'), -3000);
        chai.assert.equal(closingValue(partnercontract2, 'T-2020-12'), -7000);
        chai.assert.equal(closingValue(otherPartnercontract, 'T-2018-12'), 0);
        chai.assert.equal(closingValue(otherPartnercontract, 'T-2019-12'), 0);
        chai.assert.equal(closingValue(otherPartnercontract, 'T-2020-12'), -710);
        chai.assert.equal(closingValue(partnerId, 'T-2020-12'), -8400);
        chai.assert.equal(closingValue(partnerId, 'T-2020'), -8400);

        chai.assert.equal(openingValue(partnercontract1, 'T-2018'), 0);
        chai.assert.equal(openingValue(partnercontract1, 'T-2019'), -300);
        chai.assert.equal(openingValue(partnercontract1, 'T-2019-01'), -300);
        chai.assert.equal(openingValue(partnercontract1, 'T-2020'), -550);
      });

      it('throws if partner closing balance date is not the end of year', function () {
        chai.assert.equal(Balances.getClosingValue({
          communityId: Fixture.demoCommunityId,
          partner: 'WfS8p9zKdSHFJcewK',
          tag: 'T-2018-12',
        }).total(), -300);
        chai.assert.throws(() => {
          Balances.getClosingValue({
            communityId: Fixture.demoCommunityId,
            partner: 'WfS8p9zKdSHFJcewK',
            tag: 'T-2019-08',
          });
        }, 'Debug assertion failed');
      });
      it('throws if partner opening balance date is not the beginning of year', function () {
        chai.assert.equal(Balances.getOpeningValue({
          communityId: Fixture.demoCommunityId,
          partner: 'WfS8p9zKdSHFJcewK',
          tag: 'T-2019-01',
        }).total(), -300);
        chai.assert.throws(() => {
          Balances.getOpeningValue({
            communityId: Fixture.demoCommunityId,
            partner: 'WfS8p9zKdSHFJcewK',
            tag: 'T-2018-12',
          });
        }, 'Debug assertion failed');
      });
    });

    describe('accounts api', function () {
      it('updates isGroup property automatically', function () {
        chai.assert.isTrue(Accounts.getByCode('`', Fixture.demoCommunityId).isGroup);
        chai.assert.isTrue(Accounts.getByCode('`1', Fixture.demoCommunityId).isGroup);
        chai.assert.isTrue(Accounts.getByCode('`12', Fixture.demoCommunityId).isGroup);
        chai.assert.isUndefined(Accounts.getByCode('`12A', Fixture.demoCommunityId).isGroup);
        chai.assert.isUndefined(Accounts.getByCode('`12B', Fixture.demoCommunityId).isGroup);
        chai.assert.isUndefined(Accounts.getByCode('`12C', Fixture.demoCommunityId).isGroup);
        chai.assert.isUndefined(Accounts.getByCode('`19', Fixture.demoCommunityId).isGroup);

        Accounts.update({ communityId: Fixture.demoCommunityId, code: '`12A' }, { $set: { code: '`20' } });
        chai.assert.isTrue(Accounts.getByCode('`12', Fixture.demoCommunityId).isGroup);
        chai.assert.isUndefined(Accounts.getByCode('`20', Fixture.demoCommunityId).isGroup);

        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`12B' });
        chai.assert.isTrue(Accounts.getByCode('`12', Fixture.demoCommunityId).isGroup);
        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`12C' });
        chai.assert.isFalse(Accounts.getByCode('`12', Fixture.demoCommunityId).isGroup);
        chai.assert.isTrue(Accounts.getByCode('`1', Fixture.demoCommunityId).isGroup);

        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`12' });
        chai.assert.isTrue(Accounts.getByCode('`1', Fixture.demoCommunityId).isGroup);

        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`19' });
        chai.assert.isFalse(Accounts.getByCode('`1', Fixture.demoCommunityId).isGroup);

        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`1' });
        chai.assert.isTrue(Accounts.getByCode('`', Fixture.demoCommunityId).isGroup);

        Accounts.remove({ communityId: Fixture.demoCommunityId, code: '`20' });
        chai.assert.isFalse(Accounts.getByCode('`', Fixture.demoCommunityId).isGroup);
      });
    });
  });
}
