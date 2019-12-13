/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import '/imports/api/transactions/methods.js';
import { Transactions } from '../transactions';
import { Balances } from './balances';

if (Meteor.isServer) {
  let Fixture;

  describe('balances', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
      Breakdowns.remove({});
    });

    describe('api', function () {
      let insertTx;
      let assertBalance;
      before(function () {
        Breakdowns.define({ communityId: Fixture.demoCommunityId,
          digit: ':', name: 'COA',
          children: [
            { digit: '1', name: 'Level1',
              children: [
                { digit: '2', name: 'Level2',
                  children: [
                  { digit: 'A', name: 'LeafA' },
                  { digit: 'B', name: 'LeafB' },
                  { digit: 'C', name: 'LeafC' },
                  ],
                },
                { name: '',
                  children: [
                  { digit: '9', name: 'LeafD' },
                  ],
                },
              ],
            },
            { name: '',
              children: [
                { name: '',
                  children: [
                  { digit: 'E', name: 'LeafE' },
                  ],
                },
                { digit: '3', name: 'Level3',
                  children: [
                  { digit: 'F', name: 'LeafF' },
                  ],
                },
              ],
            },
          ],
        });
        Breakdowns.define({
          digit: '@', name: 'Localizer', communityId: Fixture.demoCommunityId,
          children: [
            { digit: 'A', name: 'Building A',
              children: [
                { digit: '101', name: 'A101' },
                { digit: '202', name: 'A202' },
                { digit: '303', name: 'A303' },
              ],
            },
            { digit: 'B', name: 'Building B',
              children: [
                { digit: '101', name: 'B101' },
              ],
            },
          ],
        });
        insertTx = function (params) {
          return Transactions.methods.insert._execute({ userId: Fixture.demoAccountantId }, {
            communityId: Fixture.demoCommunityId,
            category: 'void',
            valueDate: params.valueDate,
            amount: params.amount,
            credit: [{
              account: params.credit[0],
              localizer: params.credit[1],
            }],
            debit: [{
              account: params.debit[0],
              localizer: params.debit[1],
            }],
          });
        };
        assertBalance = function (account, localizer, tag, expectedBalance) {
          const balance = Balances.getTotal({
            communityId: Fixture.demoCommunityId,
            account,
            localizer,
            tag,
          });
          chai.assert.equal(balance, expectedBalance);
        };
      });

      beforeEach(function () {
        Transactions.remove({});
      });

      it('updates balances with tx operations', function (done) {
        insertTx({
          valueDate: new Date('2017-01-01'),
          amount: 1000,
          credit: [':12A'],
          debit: [':19'],
        });
        assertBalance(':12A', undefined, 'T', -1000);
        assertBalance(':12A', undefined, 'T-2017', -1000);
        assertBalance(':12A', undefined, 'T-2017-01', -1000);
        assertBalance(':12A', undefined, 'T-2017-02', 0);
        assertBalance(':12', undefined, 'T-2017-01', -1000);
        assertBalance(':1', undefined, 'T-2017-01', 0);
        assertBalance(':19', undefined, 'T', 1000);

        const txId = insertTx({
          valueDate: new Date('2017-02-02'),
          amount: 2000,
          credit: [':12A'],
          debit: [':19'],
        });
        assertBalance(':12A', undefined, 'T', -3000);
        assertBalance(':12A', undefined, 'T-2017', -3000);
        assertBalance(':12A', undefined, 'T-2017-01', -1000);
        assertBalance(':12A', undefined, 'T-2017-02', -2000);
        assertBalance(':12', undefined, 'T-2017-01', -1000);
        assertBalance(':12', undefined, 'T-2017-02', -2000);
        assertBalance(':1', undefined, 'T-2017-01', 0);
        assertBalance(':1', undefined, 'T-2017-02', 0);
        assertBalance(':1', undefined, 'T-2017', 0);
        assertBalance(':19', undefined, 'T', 3000);

        Transactions.remove(txId);
        // copy of the previous test's end state
        assertBalance(':12A', undefined, 'T', -1000);
        assertBalance(':12A', undefined, 'T-2017', -1000);
        assertBalance(':12A', undefined, 'T-2017-01', -1000);
        assertBalance(':12A', undefined, 'T-2017-02', 0);
        assertBalance(':12', undefined, 'T-2017-01', -1000);
        assertBalance(':1', undefined, 'T-2017-01', 0);
        assertBalance(':19', undefined, 'T', 1000);

        done();
      });

      it('updates balances of localizer', function (done) {
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          credit: [':12B', '@A101'],
          debit: [':12C'],
        });
        assertBalance(':12B', '@A101', 'T', -500);
        assertBalance(':12B', '@A101', 'T-2017-03', -500);
        chai.assert.throws(() =>
          assertBalance(':12B', '@A', 'T', -500) // todo? upward cascading localizer 
        );
        assertBalance(':12B', undefined, 'T', -500); // non-localized main account is also updated
        assertBalance(':12C', '@A101', 'T', 0);      // non-existing localized account answers with 0
        assertBalance(':12C', undefined, 'T', 500);
        assertBalance(':12', undefined, 'T', 0);
        assertBalance(':12', '@A101', 'T', -500);  // localized parent account not allowed (for now)
        assertBalance(':1', undefined, 'T', 0);
        assertBalance(':1', '@A101', 'T', -500);

        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          credit: [':12C', '@A101'],
          debit: [':12B'],
        });
        assertBalance(':12C', undefined, 'T', 0);
        assertBalance(':12C', '@A101', 'T', -500);
        done();
      });

      it('updates balances of both account and localizer', function (done) {
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 600,
          credit: [':12A', '@A101'],
          debit: [':12B', '@B101'],
        });
        assertBalance(':12A', '@A101', 'T', -600);
        assertBalance(':12B', '@B101', 'T', 600);
//        assertBalance(undefined, '@A', 'T', -600);
//        assertBalance(undefined, '@B', 'T', 600);
//        assertBalance(undefined, '@', 'T', 0);
        done();
      });
    });
  });
}
