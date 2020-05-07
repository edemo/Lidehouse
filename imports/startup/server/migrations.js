import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Migrations } from 'meteor/percolate:migrations';
import { moment } from 'meteor/momentjs:moment';

import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Notifications } from '/imports/api/notifications/notifications.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/votings/votings.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import '/imports/api/transactions/accounts/template.js';

const keepOrderSort = { sort: { updatedAt: 1 } };   // use this to keep updatedAt order intact

Migrations.add({
  version: 1,
  name: 'Add CreatedBy and UpdatedBy fields (and use CreatedBy instead of userId)',
  up() {
    /* function upgrade(collection) {
      collection.find({ creatorId: { $exists: false } }).forEach(doc => {
        const creatorId = doc.userId;
        collection.update(doc._id, { $unset: { userId: 0 } });
        collection.update(doc._id, { $set: { creatorId } });
      });
    }
    upgrade(Topics);
    upgrade(Comments); */
  },
});

Migrations.add({
  version: 2,
  name: 'Use communityId:null for the shared assets',
  up() {
   /*  function upgrade(collection) {
      collection.update(
        { communityId: { $exists: false } },
        { $set: { communityId: null } },
        { multi: true }
      );
    }
    upgrade(Sharedfolders);
    upgrade(Breakdowns); */
  },
});

Migrations.add({
  version: 3,
  name: 'Tickets get a type',
  up() {
    /* Topics.update(
      { category: 'ticket', 'ticket.type': { $exists: false } },
      { $set: { 'ticket.type': 'issue' } },
      { multi: true }
    ); */
  },
});

Migrations.add({
  version: 4,
  name: 'Vote closesAt is set directly on topic',
  up() {
    /* Topics.find({ category: 'vote', 'vote.closesAt': { $gte: new Date() } }).forEach((topic) => {
      const closingDate = topic.vote.closesAt;
      Topics.update(topic._id, { $set: { closesAt: closingDate } });
     // Topics.update(topic._id, { $unset: { 'vote.closesAt': 0 } });
    }); */
  },
});

Migrations.add({
  version: 5,
  name: 'Topics all get a status',
  up() {
   /*  Topics.find({ category: 'ticket', status: { $exists: false } }).forEach((ticket) => {
      if (!ticket.ticket.status) throw new Meteor.Error('err_migrationFailed', 'There is no ticket.ticket.status');
      Topics.update(ticket._id, { $set: { status: ticket.ticket.status } });
    });
    Topics.update(
      { status: { $exists: false }, closed: false },
      { $set: { status: 'opened' } },
      { multi: true }
    );
    Topics.update(
      { status: { $exists: false }, closed: true },
      { $set: { status: 'closed' } },
      { multi: true }
    ); */
  },
});

Migrations.add({
  version: 6,
  name: 'Communities get a settings section and an accountingMethod',
  up() {
  /*   Communities.update(
      { settings: { $exists: false } },
      { $set: { settings: {
        joinable: true,
        language: 'hu',
        parcelRefFormat: '[bPT]fdd',
        topicAgeDays: 365,
        accountingMethod: 'accrual' } } },
      { multi: true }
    ); */
  },
});

Migrations.add({
  version: 7,
  name: 'Topics need serial',
  up() {
   /*  Topics.find({}, { sort: { createdAt: 1 } }).forEach((doc) => {
      const selector = { communityId: doc.communityId, category: doc.category };
      const last = Topics.findOne(selector, { sort: { serial: -1 } });
      const lastSerial = last ? (last.serial || 0) : 0;
      const nextSerial = lastSerial + 1;
      doc.serial = nextSerial;
      Topics.update(doc._id, { $set: { serial: nextSerial, serialId: doc.computeSerialId() } });
    }); */
  },
});

Migrations.add({
  version: 8,
  name: 'Remove leadRef from parcel, and create parcelships with it',
  up() {
    /* Parcels.find({ leadRef: { $exists: true } }).fetch().filter(p => p.ref !== p.leadRef).forEach((doc) => {
      const leadParcel = Parcels.findOne({ communityId: doc.communityId, ref: doc.leadRef });
      if (leadParcel) {
        Parcelships.insert({ communityId: doc.communityId, parcelId: doc._id, leadParcelId: leadParcel._id });
      }
    }); */
  },
});

Migrations.add({
  version: 9,
  name: 'Comments category is now required field',
  up() {
   /*  Comments.update(
      { category: { $exists: false } },
      { $set: { category: 'comment' } },
      { multi: true }
    ); */
  },
});

Migrations.add({
  version: 10,
  name: 'Membership persons become partners, and partners cast the votes, delegate and pay the bills',
  up() {
    /* Memberships.update(
      { 'person.idCard.name': { $exists: true },
        'person.contact.email': { $exists: false },
        'person.userId': { $exists: true } },
      { $unset: { 'person.userId': 0 } },
      { multi: true }
    );
    Memberships.find({}).forEach((doc) => {
      let partnerId;
      if (doc.person && doc.person.idCard && doc.person.idCard.name) {
        const partnerByName = Partners.findOne({ communityId: doc.communityId, 'idCard.name': doc.person.idCard.name });
        if (partnerByName) partnerId = partnerByName._id;
      } else if (doc.personId) {
        const partnerById = Partners.findOne({ communityId: doc.communityId, userId: doc.personId });
        if (partnerById) partnerId = partnerById._id;
      }
      const person = _.extend(doc.person, { communityId: doc.communityId, relation: 'member' });
      if (!partnerId) partnerId = Partners.insert(person);
      const newFields = { partnerId };
      if (doc.person.userId) {
        newFields.userId = doc.person.userId;
      }
      Memberships.update(doc._id, { $set: newFields, $unset: { person: '', personId: '' } });
    });
    Topics.find({ category: 'vote' }).forEach((doc) => {
      const modifier = {};
      modifier['$set'] = {};
      _.each(doc.voteCasts, (vote, userId) => {
        const partnerId = Meteor.users.findOne(userId).partnerId(doc.communityId);
        modifier['$set']['voteCasts.' + partnerId] = vote;
      });
      if (_.isEmpty(modifier.$set)) return;
      Topics.update(doc._id, { $set: { voteCasts: {} } }, { selector: { category: 'vote' } });
      Topics.update(doc._id, modifier, { selector: { category: 'vote' } });
      const updatedDoc = Topics.findOne(doc._id);
      updatedDoc.voteEvaluate(); // calculates all the rest of the voteResults fields
      // We assume here that the registered delegations have not changed since the voting, but that's OK, noone delegated actually
    });
    Delegations.find({}).forEach((doc) => {
      const sourceUserId = doc.sourcePersonId;
      const sourceUser = Meteor.users.findOne(sourceUserId);
      const sourcePartnerId = sourceUser ?
        sourceUser.partnerId(doc.communityId) :
        Partners.findOne({ communityId: doc.communityId, 'idCard.identifier': doc.sourcePersonId })._id;
      const targetUserId = doc.targetPersonId;
      const targetUser = Meteor.users.findOne(targetUserId);
      const targetPartnerId = targetUser.partnerId(doc.communityId);
      Delegations.update(doc._id, { $set: { sourceId: sourcePartnerId, targetId: targetPartnerId }, $unset: { sourcePersonId: '', targetPersonId: '' } });
    }); */
  },
});

Migrations.add({
  version: 11,
  name: 'Remove all documents from Transactions, Balances, Txdefs collections',
  up() {
   /*  const newTransaction = Transactions.findOne({ category: 'bill' });
    if (!newTransaction) {
      Transactions.direct.remove({});
      Balances.direct.remove({});
      Breakdowns.direct.remove({});
      Txdefs.direct.remove({});
    } */
  },
});

Migrations.add({
  version: 12,
  name: 'Move Közgyűlési meghívók, határozatok (Marina created folder) uploads to the Agendas folder ',
  up() {
   /*  const folderToKill = Sharedfolders.findOne({ name: 'Közgyűlési meghívók, határozatok' });
    if (folderToKill) {
      const folderId = folderToKill._id;
      Shareddocs.direct.update({ folderId }, { $set: { folderId: 'agenda' } }, { multi: true });
      Sharedfolders.remove(folderId);
      Sharedfolders.remove('decision');
    } */
  },
});

Migrations.add({
  version: 13,
  name: 'Remove unnecessary owners, where a lead parcel is specified',
  up() {
    /* Parcels.find({}).fetch().forEach((parcel) => {
      if (parcel.isLed()) {
        const leadParcel = parcel.leadParcel();
        Memberships.findActive({ parcelId: parcel._id, role: 'owner' }).forEach((doc) => {
          const sameDocOnLead = Memberships.findOneActive({ parcelId: leadParcel._id, role: 'owner', partnerId: doc.partnerId });
          if (sameDocOnLead) {
            if (_.isEqual(doc.ownership.share, sameDocOnLead.ownership.share)
            && _.isEqual(doc.activeTime, sameDocOnLead.activeTime)) {
              // Since it absolutely matches the doc on the lead, we can safely remove it
              console.log('Removed membership', doc._id);
              Memberships.remove(doc._id);
            }
          }
        });
      }
    }); */
  },
});

Migrations.add({
  version: 14,
  name: 'Remove duplicate partners',
  up() {
    /* Meteor.users.find({}).fetch().forEach((user) => {
      const partners = Partners.find({ userId: user._id });
      if (partners.count() > 1) {
        console.warn(`MERGE CONFLICT: User ${user._id} (${user.emails[0].address}) has multiple partners: ${partners.fetch()})`);
      }
    }); */
  },
});

Migrations.add({
  version: 15,
  name: 'Rename partner relation parcel to member',
  up() {
   /*  function upgrade(collection, field, selector = {}) {
      collection.update(
        _.extend({ [field]: 'parcel' }, selector),
        { $set: { [field]: 'member' } },
        { multi: true }
      );
    }
    upgrade(Partners, 'relation');
    upgrade(Txdefs, 'data.relation');
    upgrade(Transactions, 'relation', { category: 'bill' });
    upgrade(Transactions, 'relation', { category: 'payment' });
    upgrade(Transactions, 'relation', { category: 'receipt' }); */
  },
});

Migrations.add({
  version: 16,
  name: 'Parcels can have different categories',
  up() {
   /*  Parcels.find({ category: { $exists: false } }).forEach(parcel => {
      Parcels.update(parcel._id, { $set: { category: '@property', code: '@' + parcel.ref } });
    }); */
  },
});

Migrations.add({
  version: 17,
  name: 'Setup Accounts',
  up() {
    /* Communities.find({}).forEach(community => {
      if (!Accounts.findOne({ communityId: community._id })) {
        Templates.clone('Condominium_COA', community._id);
      }
    });
    Transactions.find({}).forEach(tx => {
      ['debit', 'credit'].forEach(side => {
        if (!tx[side]) return;
        const modifiedJournalEntries = [];
        tx[side].forEach(je => {
          const modifiedJE = _.clone(je);
          modifiedJE.account = '`' + modifiedJE.account;
          modifiedJournalEntries.push(modifiedJE);
        });
        Transactions.update(tx._id, { $set: { [side]: modifiedJournalEntries } });
      });
    });
    Balances.find({}).forEach(bal => {
      Balances.update(bal._id, { $set: { account: '`' + bal.account } });
    });
    Txdefs.find({}).forEach(def => {
      ['debit', 'credit'].forEach(side => {
        const modifiedSide = def[side].map(account => '`' + account);
        Txdefs.update(def._id, { $set: { [side]: modifiedSide } });
      });
    }); */
  },
});

Migrations.add({
  version: 18,
  name: 'Remissions are just payments',
  up() {
   /*  Txdefs.find({ category: 'remission' }).forEach(def => {
      Txdefs.update(def._id, { $set: { category: 'payment', 'data.remission': true } });
    }); */
  },
});

Migrations.add({
  version: 19,
  name: 'Transactions have a status',
  up() {
    /* Transactions.find({}).forEach(tx => {
      const status = tx.postedAt ? 'posted' : 'draft';
      Transactions.update(tx._id, { $set: { status } });
    }); */
  },
});

Migrations.add({
  version: 20,
  name: 'Billing becomes a separate sub-schema in bills',
  up() {
    /* Transactions.find({ category: 'bill' }).forEach(bill => {
      const modifier = { $set: {} };
      bill.lines.forEach((line, i) => {
        modifier.$set[`line.${i}.billing`] = { id: line.billingId, period: line.period };
      });
    }); */
  },
});

Migrations.add({
  version: 21,
  name: 'Communities status field added',
  up() {
    Communities.update(
      { status: { $exists: false } },
      { $set: { status: 'live' } },
      { multi: true }
    );
  },
});

Migrations.add({
  version: 22,
  name: 'Db stores UTC dates, so they have to be midnight, if not, it means it was imported wrong (in local time)',
  up() {
    StatementEntries.find({}).forEach(se => {
      const valueDate = moment.utc(se.valueDate);
      if (valueDate.hours() !== 0) {
        console.log("updating se");
        console.log("old date", valueDate.toString());
        valueDate.hours(0);
        valueDate.add(1, 'day');
        console.log("new date", valueDate.toString());
        StatementEntries.update(se._id, { $set: { valueDate: valueDate.toDate() } });
      }
    });
    Transactions.find({ category: 'payment' }).forEach(tx => {
      const valueDate = moment.utc(tx.valueDate);
      if (valueDate.hours() !== 0) {
        console.log("updating tx");
        console.log("old date", valueDate.toString());
        valueDate.hours(0);
        valueDate.add(1, 'day');
        console.log("new date", valueDate.toString());
        Transactions.update(tx._id, { $set: { valueDate: valueDate.toDate() } });
      }
    });
  },
});

Migrations.add({
  version: 23,
  name: 'Partners can have multiple relations',
  up() {
    Contracts.find({}).forEach(contract => {
      const relation = contract.partner().relation;
      Contracts.update(contract._id, { $set: { relation } });
    });
    Partners.find({}).forEach(partner => {
      const relation = partner.relation;
      Partners.update(partner._id, { $set: { relation: [relation] } });
    });
  },
});

Migrations.add({
  version: 24,
  name: 'LastSeens has been removed from user, and put it to his own collection',
  up() {
    Meteor.users.find({}).forEach((user) => {
      const lastSeens = user.lastSeens;
      Notifications.insert({ userId: user._id, lastSeens }, { validate: false });
      Meteor.users.update(user._id, { $unset: { lastSeens: '' } }, { validate: false });
    });
  },
});

/* Migrations.add({
  version: ??,
  name: 'Connect partner userId with membership userId',
  up() {
    Memberships.find({ userId: { $exists: false } }).forEach((m) => {
      const partner = Partners.findOne(m.partnerId);
      if (partner && partner.userId) Memberships.update({ _id: m._id }, { $set: { userId: partner.userId } });
    });
    Partners.find({ userId: { $exists: false } }).forEach((p) => {
      const membership = Memberships.findOne({ partnerId: p._id, userId: { $exists: true } });
      if (membership && membership.userId) Partners.update({ _id: p._id }, { $set: { userId: membership.userId } });
    });
  },
});
 */
Meteor.startup(() => {
  Migrations.unlock();
  Migrations.migrateTo('latest');
});
