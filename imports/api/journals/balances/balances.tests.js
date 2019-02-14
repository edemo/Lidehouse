/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import '/imports/api/journals/methods.js';
import { Journals } from '../journals';
import { Balances } from './balances';

if (Meteor.isServer) {
  let Fixture;

  describe('balances', function () {
    this.timeout(5000);
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
        Breakdowns.define({
          name: 'COA', communityId: Fixture.demoCommunityId,
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
          digit: 'L-', name: 'Localizer', communityId: Fixture.demoCommunityId,
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
          return Journals.methods.insert._execute({ userId: Fixture.demoAccountantId }, {
            communityId: Fixture.demoCommunityId,
            phase: 'done',
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
          const balance = Balances.get({
            communityId: Fixture.demoCommunityId,
            account,
            localizer,
            tag,
          });
          chai.assert.equal(balance, expectedBalance);
        };
      });

      it('updates balances after tx', function (done) {
        insertTx({
          valueDate: new Date('2017-01-01'),
          amount: 1000,
          credit: ['12A'],
          debit: ['19'],
        });
        assertBalance('12A', undefined, 'T', -1000);
        assertBalance('12A', undefined, 'T-2017', -1000);
        assertBalance('12A', undefined, 'T-2017-1', -1000);
        assertBalance('12A', undefined, 'T-2017-2', 0);
        assertBalance('12', undefined, 'T-2017-1', -1000);
        assertBalance('1', undefined, 'T-2017-1', 0);
        assertBalance('19', undefined, 'T', 1000);
        done();
      });

      it('updates balances for removed tx', function (done) {
        const txId = insertTx({
          valueDate: new Date('2017-02-02'),
          amount: 2000,
          credit: ['12A'],
          debit: ['19'],
        });
        assertBalance('12A', undefined, 'T', -3000);
        assertBalance('12A', undefined, 'T-2017', -3000);
        assertBalance('12A', undefined, 'T-2017-1', -1000);
        assertBalance('12A', undefined, 'T-2017-2', -2000);
        assertBalance('12', undefined, 'T-2017-1', -1000);
        assertBalance('12', undefined, 'T-2017-2', -2000);
        assertBalance('1', undefined, 'T-2017-1', 0);
        assertBalance('1', undefined, 'T-2017-2', 0);
        assertBalance('1', undefined, 'T-2017', 0);
        assertBalance('19', undefined, 'T', 3000);

        Journals.remove(txId);
        // copy of the previous test's end state
        assertBalance('12A', undefined, 'T', -1000);
        assertBalance('12A', undefined, 'T-2017', -1000);
        assertBalance('12A', undefined, 'T-2017-1', -1000);
        assertBalance('12A', undefined, 'T-2017-2', 0);
        assertBalance('12', undefined, 'T-2017-1', -1000);
        assertBalance('1', undefined, 'T-2017-1', 0);
        assertBalance('19', undefined, 'T', 1000);

        done();
      });

      it('updates balances of localizer', function (done) {
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          credit: ['12B', 'L-A101'],
          debit: ['12C'],
        });
        assertBalance(undefined, 'L-A101', 'T', -500);
        assertBalance(undefined, 'L-A101', 'T-2017-3', -500);
        assertBalance(undefined, 'L-A', 'T', -500);
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 500,
          credit: ['12B'],
          debit: ['12C', 'L-A101'],
        });
        assertBalance(undefined, 'L-A101', 'T', 0);
        assertBalance(undefined, 'L-A101', 'T-2017-3', 0);
        assertBalance(undefined, 'L-A', 'T', 0);
        done();
      });

      it('updates balances of both account and localizer', function (done) {
        insertTx({
          valueDate: new Date('2017-03-03'),
          amount: 600,
          credit: ['12A', 'L-A101'],
          debit: ['12B', 'L-B101'],
        });
        chai.assert.throws(() => assertBalance('12A', 'L-A101', 'T', -600));  // No 2D balances stored
        chai.assert.throws(() => assertBalance('12B', 'L-B101', 'T', 600));  // No 2D balances stored
        assertBalance(undefined, 'L-A101', 'T', -600);
        assertBalance(undefined, 'L-B101', 'T', 600);
        assertBalance(undefined, 'L-A', 'T', -600);
        assertBalance(undefined, 'L-B', 'T', 600);
        assertBalance(undefined, 'L-', 'T', 0);
        done();
      });
    });
  });
}
