/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { freshFixture, emptyFixture } from '/imports/api/test-utils.js';
import { insertDemoHouse } from '/imports/fixture/demohouse.js';
import { Log } from '/imports/utils/log.js';

import { Transactions } from '/imports/api/accounting/transactions.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';

if (Meteor.isServer) {
  let communityId;
  let community;
  let admin;
  let userId;

  xdescribe('Transactions performance', function () {
    this.timeout(3500000);

    describe('Performance measurement', function () {
      let Fixture;
      const billIds1 = [];
      const billIds10 = [];

      before(function () {
        Fixture = freshFixture();
        communityId = Fixture.demoCommunityId;
        Communities.update(Fixture.demoCommunityId, { $set: { 'settings.accountingMethod': 'accrual' } });
        // Need to apply, so the member contracts get created
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, ids: [Fixture.parcelBilling], date: new Date() });
      });

      it('Creating a something', function () {
        const Somethings = new Mongo.Collection('Somethings');
        for (let i = 0; i < 100; i++) {
          Somethings.insert({ value: i });
        }
      });

      it('Creating a balance', function () {
        for (let i = 0; i < 100; i++) {
          Balances.insert({ communityId, account: `\`${i}`, tag: 'C', debit: 0 });
        }
      });

      it('Updating a balance', function () {
        for (let i = 0; i < 100; i++) {
          Balances.update({ communityId, account: `\`${i}`, tag: 'C' }, { $set: { debit: 100 } });
        }
      });

      it('Creating a 1 line bill', function () {
        const partnerId = Fixture.partnerId(Fixture.dummyUsers[3]);
        for (let i = 0; i < 100; i++) {
          billIds1.push(Fixture.builder.create('bill', {
            relation: 'member',
            partnerId,
            contractId: Contracts.findOne({ partnerId })._id,
            relationAccount: '`33',
            issueDate: new Date(),
            deliveryDate: moment().subtract(1, 'weeks').toDate(),
            dueDate: moment().add(1, 'weeks').toDate(),
            lines: [{
              title: 'Work 1',
              uom: 'piece',
              quantity: 1,
              unitPrice: 300,
              account: '`951',
              localizer: '@',
              parcelId: Fixture.dummyParcels[1],
            }],
          }));
        }
      });

      it('Posting a 1 line bill', function () {
        billIds1.forEach(billId => {
          Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        });
      });

      it('Creating a 10 line bill', function () {
        const partnerId = Fixture.partnerId(Fixture.dummyUsers[3]);
        for (let i = 0; i < 100; i++) {
          const bill = {
            relation: 'member',
            partnerId,
            contractId: Contracts.findOne({ partnerId })._id,
            relationAccount: '`33',
            issueDate: new Date(),
            deliveryDate: moment().subtract(1, 'weeks').toDate(),
            dueDate: moment().add(1, 'weeks').toDate(),
            lines: [],
          };
          for (let l = 0; l < 10; l++) {
            bill.lines.push({
              title: `Work ${i}`,
              uom: 'piece',
              quantity: 1,
              unitPrice: 300,
              account: '`951',
              localizer: '@',
              parcelId: Fixture.dummyParcels[1],
            });
          }
          billIds10.push(Fixture.builder.create('bill', bill));
        }
      });

      it('Posting a 10 line bill', function () {
        billIds10.forEach(billId => {
          Fixture.builder.execute(Transactions.methods.post, { _id: billId });
        });
      });
    });

    describe('Performance measurement with loads of data', function () {
      before(function () {
        emptyFixture();
        Meteor.settings.public.fakeMembersNr = 100;
        communityId = insertDemoHouse('en', 'test');
        community = Communities.findOne(communityId);
        admin = community.admin();
        userId = admin._id;
      });
      after(function () {
        delete Meteor.settings.public.fakeMembersNr;
      });

      it('Creating a balance', function () {
        for (let i = 0; i < 100; i++) {
          Balances.insert({ communityId, account: `\`${i}`, tag: 'C', debit: 0 });
        }
      });

      it('Updating a balance', function () {
        for (let i = 0; i < 100; i++) {
          Balances.update({ communityId, account: `\`${i}`, tag: 'C' }, { $set: { debit: 100 } });
        }
      });

      it('applying parcelbillings, posting bills', function () {
        Meters.find({}).forEach(meter => {
          Meters.methods.registerReading._execute({ userId },
            { _id: meter._id, reading: { date: moment().subtract(1, 'weeks').toDate(), value: 25 } });
        });
        ParcelBillings.methods.apply._execute({ userId }, { communityId, date: new Date() });
        const bills = Transactions.find({ category: 'bill', relation: 'member', status: 'draft' });
        Log.info('BILLS COUNT ', bills.count());
        bills.forEach(bill => {
          Transactions.methods.post._execute({ userId }, { _id: bill._id });
        });
      });
    });
  });
}
