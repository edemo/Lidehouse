import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Migrations } from 'meteor/percolate:migrations';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/votings/votings.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

const keepOrderSort = { sort: { updatedAt: 1 } };   // use this to keep updatedAt order intact

Migrations.add({
  version: 1,
  name: 'Add CreatedBy and UpdatedBy fields (and use CreatedBy instead of userId)',
  up() {
    function upgrade(collection) {
      collection.find({ creatorId: { $exists: false } }).forEach(doc => {
        const creatorId = doc.userId;
        collection.update(doc._id, { $unset: { userId: 0 } });
        collection.update(doc._id, { $set: { creatorId } });
      });
    }
    upgrade(Topics);
    upgrade(Comments);
  },
});

Migrations.add({
  version: 2,
  name: 'Use communityId:null for the shared assets',
  up() {
    function upgrade(collection) {
      collection.update(
        { communityId: { $exists: false } },
        { $set: { communityId: null } },
        { multi: true }
      );
    }
    upgrade(Sharedfolders);
    upgrade(Breakdowns);
  },
});

Migrations.add({
  version: 3,
  name: 'Tickets get a type',
  up() {
    Topics.update(
      { category: 'ticket', 'ticket.type': { $exists: false } },
      { $set: { 'ticket.type': 'issue' } },
      { multi: true }
    );
  },
});

Migrations.add({
  version: 4,
  name: 'Vote closesAt is set directly on topic',
  up() {
    Topics.find({ category: 'vote', 'vote.closesAt': { $gte: new Date() } }).forEach((topic) => {
      const closingDate = topic.vote.closesAt;
      Topics.update(topic._id, { $set: { closesAt: closingDate } });
     // Topics.update(topic._id, { $unset: { 'vote.closesAt': 0 } });
    });
  },
});

Migrations.add({
  version: 5,
  name: 'Topics all get a status',
  up() {
    Topics.find({ category: 'ticket', status: { $exists: false } }).forEach((ticket) => {
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
    );
  },
});

Migrations.add({
  version: 6,
  name: 'Communities get a settings section and an accountingMethod',
  up() {
    Communities.update(
      { settings: { $exists: false } },
      { $set: { settings: {
        joinable: true,
        language: 'hu',
        parcelRefFormat: '[bPT]fdd',
        topicAgeDays: 365,
        accountingMethod: 'accrual' } } },
      { multi: true }
    );
  },
});

Migrations.add({
  version: 7,
  name: 'Topics need serial',
  up() {
    Topics.find({}, { sort: { createdAt: 1 } }).forEach((doc) => {
      const selector = { communityId: doc.communityId, category: doc.category };
      const last = Topics.findOne(selector, { sort: { serial: -1 } });
      const lastSerial = last ? (last.serial || 0) : 0;
      const nextSerial = lastSerial + 1;
      doc.serial = nextSerial;
      Topics.update(doc._id, { $set: { serial: nextSerial, serialId: doc.computeSerialId() } });
    });
  },
});

Migrations.add({
  version: 8,
  name: 'Remove leadRef from parcel, and create parcelships with it',
  up() {
    Parcels.find({ leadRef: { $exists: true } }).fetch().filter(p => p.ref !== p.leadRef).forEach((doc) => {
      const leadParcel = Parcels.findOne({ communityId: doc.communityId, ref: doc.leadRef });
      if (leadParcel) {
        Parcelships.insert({ communityId: doc.communityId, parcelId: doc._id, leadParcelId: leadParcel._id });
      }
    });
  },
});

Migrations.add({
  version: 9,
  name: 'Comments category is now required field',
  up() {
    Comments.update(
      { category: { $exists: false } },
      { $set: { category: 'comment' } },
      { multi: true }
    );
  },
});

Migrations.add({
  version: 10,
  name: 'Membership persons become partners, and partners cast the votes, delegate and pay the bills',
  up() {
    Memberships.update(
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
      const person = _.extend(doc.person, { communityId: doc.communityId, relation: 'parcel' });
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
    });
  },
});

Migrations.add({
  version: 11,
  name: 'Remove all documents from Transactions, Balances, Txdefs collections',
  up() {
    const newTransaction = Transactions.findOne({ category: 'bill' });
    if (!newTransaction) {
      Transactions.direct.remove({});
      Balances.direct.remove({});
      Txdefs.direct.remove({ communityId: { $ne: null } });
    }
  },
});

Migrations.add({
  version: 12,
  name: 'Move Közgyűlési meghívók, határozatok (Marina created folder) uploads to the Agendas folder ',
  up() {
    const folderToKill = Sharedfolders.findOne({ name: 'Közgyűlési meghívók, határozatok' });
    if (folderToKill) {
      const folderId = folderToKill._id;
      Shareddocs.direct.update({ folderId }, { $set: { folderId: 'agenda' } }, { multi: true });
      Sharedfolders.remove(folderId);
      Sharedfolders.remove('decision');
    }
  },
});



Meteor.startup(() => {
  Migrations.unlock();
  Migrations.migrateTo('latest');
});
