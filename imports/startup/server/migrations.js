import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Migrations } from 'meteor/percolate:migrations';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';

import { productionAssert } from '/imports/utils/assert.js';
import { Relations } from '/imports/api/core/relations.js';
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
import { Meters } from '/imports/api/meters/meters.js';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { defineTxdefTemplates } from '/imports/api/transactions/txdefs/template';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import { AccountingPeriods } from '/imports/api/transactions/periods/accounting-periods.js';
import { officerRoles, everyRole, nonOccupantRoles, Roles } from '/imports/api/permissions/roles.js';
import { updateMyLastSeen, mergeLastSeen } from '/imports/api/users/methods.js';
import { autoValueUpdate } from '/imports/api/mongo-utils.js';

const keepOrderSort = { sort: { updatedAt: 1 } };   // use this to keep updatedAt order intact

// Use only direct db operations to avoid unnecessary hooks!

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
    /* Communities.update(
      { status: { $exists: false } },
      { $set: { status: 'live' } },
      { multi: true }
    ); */
  },
});

Migrations.add({
  version: 22,
  name: 'Db stores UTC dates, so they have to be midnight, if not, it means it was imported wrong (in local time)',
  up() {
    /* StatementEntries.find({}).forEach(se => {
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
    }); */
  },
});

Migrations.add({
  version: 23,
  name: 'Partners can have multiple relations',
  up() {
    /* Contracts.find({}).forEach(contract => {
      const relation = contract.partner()?.relation;
      if (relation) Contracts.update(contract._id, { $set: { relation } });
    });
    Partners.find({}).forEach(partner => {
      const relation = partner.relation;
      Partners.update(partner._id, { $set: { relation: [relation] } });
    }); */
  },
});

Migrations.add({
  version: 24,
  name: 'LastSeens has been removed from user, and put it to his own collection',
  up() {
    /* Meteor.users.find({}).forEach((user) => {
      const lastSeens = user.lastSeens;
      Notifications.insert({ userId: user._id, lastSeens }, { validate: false });
      Meteor.users.update(user._id, { $unset: { lastSeens: '' } }, { validate: false });
    }); */
  },
});

Migrations.add({
  version: 25,
  name: 'Parcel.type and Membership.rank becomes simple text field',
  up() {
    /* Communities.find().forEach((c) => {
      const language = c.settings.language;
      const parcelTypes = Object.keys(c.parcels);

      Parcels.find({ communityId: c._id, type: { $exists: true } }).forEach((p) => {
        const type = TAPi18n.__(`schemaParcels.type.${p.type}`, {}, language);
        Parcels.update(p._id, { $set: { type } }, { selector: { category: '@property' }, validate: false });
      });

      // removing old parcel types
      parcelTypes.forEach((pt) => {
        const key = `parcels.${pt}`;
        Communities.update(c._id, { $unset: { [key]: '' } });
      });

      officerRoles.forEach(role => {
        Memberships.find({ communityId: c._id, role, rank: { $exists: true } }).forEach((m) => {
          const rank = TAPi18n.__(`schemaMemberships.rank.${m.rank}`, {}, language);
          Memberships.update(m._id, { $set: { rank } }, { selector: { role }, validate: false });
        });
      });
    }); */
  },
});

Migrations.add({
  version: 26,
  name: 'Meters.service becomes simple text field',
  up() {
    /* Communities.find().forEach((c) => {
      const language = c.settings.language;
      Meters.find({ communityId: c._id }).forEach((m) => {
        const service = TAPi18n.__(`schemaMeters.service.${m.service}`, {}, language);
        Meters.update(m._id, { $set: { service } }, { validate: false });
      });
      ParcelBillings.find({ communityId: c._id }).forEach((pb) => {
        if (pb?.consumption?.service) {
          const service = TAPi18n.__(`schemaMeters.service.${pb.consumption.service}`, {}, language);
          ParcelBillings.update(pb._id, { $set: { 'consumption.service': service } }, { validate: false });
        }
      });
    }); */
  },
});

Migrations.add({
  version: 27,
  name: 'Create contracts for members',
  up() {
    /* Parcels.find({}).fetch().filter(p => !(p.leadRef && p.ref !== p.leadRef)).forEach(p => {
      const membership = p._payerMembership();
      if (!membership) return;
      const contractId = Contracts.insert({
        communityId: p.communityId,
        relation: 'member',
        partnerId: membership.partnerId,
        parcelId: p._id,
//        membershipId: membership._id,
        habitants: p.habitants,
        outstanding: membership.outstanding,
      });
      Transactions.find({ membershipId: membership._id }).forEach((tx) => {
        Transactions.update(tx._id, { $set: { contractId }, $unset: { membershipId: '' } }, { selector: tx, validate: false });
      });
    });
    const notConverted = Transactions.find({ membershipId: { $exists: true } });
    productionAssert(!notConverted.fetch().length, notConverted.fetch());
   */ },
});

Migrations.add({
  version: 28,
  name: 'Replace parcelships with contracts',
  up() {
    /* Parcelships.find({}).fetch().filter(p => p.parcelId !== p.leadParcelId).forEach(p => {
      const contractId = Contracts.insert({
        communityId: p.communityId,
        relation: 'member',
        partnerId: p.leadParcel()._payerMembership().partnerId,
        parcelId: p.parcelId,
        leadParcelId: p.leadParcelId,
      });
      Parcels.update(p.parcelId, { $unset: { leadRef: '' } }, { validate: false });
    });
    Parcelships.direct.remove({});
   */ },
});

Migrations.add({
  version: 29,
  name: 'Multiple attachment on topic',
  up() {
    /* Topics.find({ photo: { $exists: true } }).forEach(topic => {
      if (typeof topic.photo !== 'string') return;
      const photo = topic.photo;
      const uploadedPhoto = Attachments.findOne({ path: photo });
      if (uploadedPhoto) Attachments.direct.update(uploadedPhoto._id, { $set: { parentId: topic._id } });
      Topics.update(topic._id, { $set: { attachments: [photo] }, $unset: { photo: '' } }, { selector: topic, validate: false });
    }); */
  },
});

Migrations.add({
  version: 30,
  name: 'Parent collection on attachment',
  up() {
    /* Attachments.find({ parentId: { $exists: true } }).forEach(attachment => {
      if (Topics.findOne(attachment.parentId)) {
        Attachments.direct.update(attachment._id, { $set: { parentCollection: 'topics' } });
      } else {
        console.warn(`ATTACHMENT ${attachment._id} does not belong to any topic`);
      }
    }); */
  },
});

Migrations.add({
  version: 31,
  name: 'Attachment behaviour on comments for multi photo',
  up() {
    /* Comments.find({ photo: { $exists: true } }).forEach(comment => {
      if (typeof comment.photo !== 'string') return;
      const photo = comment.photo;
      const uploadedPhoto = Attachments.findOne({ path: photo });
      if (uploadedPhoto) Attachments.direct.update(uploadedPhoto._id, { $set: { parentId: comment._id, parentCollection: 'comments' } });
      Comments.update(comment._id, { $set: { photo: [photo] } }, { selector: comment, validate: false });
    }); */
  },
});

Migrations.add({
  version: 32,
  name: 'Connect partner userId with membership userId',
  up() {
    /* Memberships.find({ $and: [{ userId: { $exists: false } }, { partnerId: { $exists: true } }] }).forEach((m) => {
      const partner = Partners.findOne(m.partnerId);
      if (partner && partner.userId) Memberships.update({ _id: m._id }, { $set: { userId: partner.userId } }, { selector: m });
    });
    Partners.find({ userId: { $exists: false } }).forEach((p) => {
      const membership = Memberships.findOne({ partnerId: p._id, userId: { $exists: true } });
      if (membership && membership.userId) Partners.update({ _id: p._id }, { $set: { userId: membership.userId } });
    }); */
  },
});

Migrations.add({
  version: 33,
  name: 'Set memberships to accepted if user is verified',
  up() {
    /* Memberships.find({ userId: { $exists: true }, accepted: false }).forEach((m) => {
      const user = Meteor.users.findOne({ _id: m.userId });
      if (user && user.isVerified()) {
        Memberships.direct.update(m._id, { $set: { accepted: true } });
      }
    }); */
  },
});

Migrations.add({
  version: 34,
  name: 'Get bill emails setting on user profile',
  up() {
    // Meteor.users.direct.update({ 'settings.getBillEmail': { $exists: false } }, { $set: { 'settings.getBillEmail': true } }, { multi: true });
  },
});

Migrations.add({
  version: 35,
  name: 'Ensure all bills and payments have a contractId, and they match',
  up() {
    /* Transactions.find({ category: 'bill' }).forEach(doc => {
      if (!doc.contractId) {
        doc.validate(); // creates default contract, if no contractId on bill
        Transactions.direct.update(doc._id, { $set: { contractId: doc.contractId } }, { selector: doc, validate: false });
      }
    });
    Transactions.find({ category: 'payment' }).forEach(doc => {
      doc.getBills?.()?.forEach((bp) => {
        const bill = Transactions.findOne(bp.id);
        if (!doc.relation || !doc.partnerId) throw new Meteor.Error('Payment relation fields are required');
        function setOrCheckEquals(field) {
          if (!doc[field]) doc[field] = bill[field];
          else if (doc[field] !== bill[field]) {
            throw new Meteor.Error(`All paid bills need to have same ${field}`, `${doc[field]} !== ${bill[field]}`);
          }
        }
        setOrCheckEquals('relation');
        setOrCheckEquals('partnerId');
        setOrCheckEquals('contractId');
      });
      doc.lines?.forEach((line) => {
        if (!doc.contractId) doc.contractId = line.contractId;
        delete line.contractId;
      });
      const id = doc._id;
      delete doc._id;
      Transactions.direct.update(id, { $set: doc });
    }); */
  },
});

Migrations.add({
  version: 36,
  name: 'Create partner entries and use balances instead of doc.outstanding',
  up() {
    /* Transactions.find({ postedAt: { $exists: true } }).forEach(tx => {
      const pEntries = tx.makePartnerEntries();
      if (pEntries) Transactions.direct.update(tx._id, { $set: pEntries }); 
    });
    Parcels.direct.update({ outstanding: { $exists: true } }, { $unset: { outstanding: '' } }, { validate: false, multi: true });
    Partners.direct.update({ outstanding: { $exists: true } }, { $unset: { outstanding: '' } }, { validate: false, multi: true });
    Contracts.direct.update({ outstanding: { $exists: true } }, { $unset: { outstanding: '' } }, { validate: false, multi: true });
    Balances.ensureAllCorrect();
   */ },
});

Migrations.add({
  version: 37,
  name: 'Communities get paymentsToBills setting',
  up() {
    // Communities.update({}, { $set: { 'settings.paymentsToBills': Relations.mainValues } }, { validate: false, multi: true });
  },
});

Migrations.add({
  version: 38,
  name: 'Parcel billling type can have multiple values',
  up() {
    /* ParcelBillings.find({}).forEach(billing => {
      let newBilllingType;
      if (billing.type) newBilllingType = [billing.type];
      else newBilllingType = billing.community().parcelTypeValues();
      ParcelBillings.direct.update(billing._id, { $set: { type: newBilllingType } });
    }); */
  },
});

Migrations.add({
  version: 39,
  name: 'Bills get a relationAccount',
  up() {
    /* Transactions.find({ category: 'bill' }).forEach(bill => {
      if (!bill.relationAccount) {
        const txdef = bill.txdef();
        const relationAccount = txdef.conteerCodes(true)[0];
        Transactions.direct.update(bill._id, { $set: { relationAccount } }, { selector: { category: 'bill' } });
      }
    }); */
  },
});

Migrations.add({
  version: 40,
  name: 'Parcelbillings get a rank',
  up() {
    /* Communities.find({}).forEach(community => {
      ParcelBillings.find({ communityId: community._id }, { sort: { createdAt: 1 } }).forEach((billing, index) => {
        ParcelBillings.direct.update(billing._id, { $set: { rank: index + 1 } });
      });
    }); */
  },
});

Migrations.add({
  version: 41,
  name: 'seId becomes an Array',
  up() {
    /* Transactions.find({ seId: { $exists: true } }).forEach(tx => {
      let modifier;
      if (typeof tx.seId === 'string') {
        modifier = { $set: { seId: [tx.seId] } };
      } else if (Array.isArray(tx.seId) && tx.seId.length === 0) {
        modifier = { $unset: { seId: '' } };
      }
      if (modifier) Transactions.direct.update(tx._id, modifier);
    }); */
  },
});

Migrations.add({
  version: 42,
  name: 'Localized account balances only needed for `33',
  up() {
   /*  Balances.find({ localizer: { $exists: true } }).forEach(b => {
      if (!b.account?.startsWith('`33')) Balances.direct.remove(b._id);
    }); */
  },
});

Migrations.add({
  version: 43,
  name: 'txId becomes an Array',
  up() {
    /* StatementEntries.find({ txId: { $exists: true } }).forEach(se => {
      let modifier;
      if (typeof se.txId === 'string') {
        modifier = { $set: { txId: [se.txId] } };
      } else if (Array.isArray(se.txId) && se.txId.length === 0) {
        modifier = { $unset: { txId: '' } };
      }
      if (modifier) StatementEntries.direct.update(se._id, modifier);
    }); */
  },
});

Migrations.add({
  version: 44,
  name: 'Calculate tx.reconciled field',
  up() {
    /* Transactions.find({}).forEach(tx => {
      const reconciled = tx.calculateReconciled();
      if (reconciled !== undefined) {
        Transactions.direct.update(tx._id, { $set: { reconciled } });
      }
    }); */
  },
});

Migrations.add({
  version: 45,
  name: 'Calculate se.reconciled field',
  up() {
   /*  StatementEntries.find({}).forEach(se => {
      const reconciled = se.calculateReconciled();
      if (reconciled !== undefined) {
        StatementEntries.direct.update(se._id, { $set: { reconciled } });
      }
    }); */
  },
});

Migrations.add({
  version: 46,
  name: 'Calculate community.registeredUnits field',
  up() {
    /* Parcels.find({ units: { $exists: true } }).forEach(parcel => {
      communityId = parcel.communityId;
      const modifier = { $inc: { registeredUnits: parcel.units } } 
      Communities.direct.update(communityId, modifier);
    }); */
  },
});

Migrations.add({
  version: 47,
  name: 'Merge double room topics',
  up() {
    /* const possibleDoubles = Topics.find({ category: 'room', updatedAt: { $gte: new Date('2021-06-15') }, commentCounter: { $gte: 1 } });
    possibleDoubles.forEach((room) => {
      const participant1 = room.participantIds[0];
      const participant2 = room.participantIds[1];
      const original = Topics.find({ participantIds: { $all: [participant1, participant2] }, title: room.title }, { sort: { createdAt: 1 } }).fetch()[0];
      const originalId = original._id;
      if (room._id === originalId) return;
      room.comments().forEach((comment) => {
        Comments.update(comment._id, { $set: { topicId: originalId } });
      });
      const timestamp = Comments.find({ topicId: originalId }, { sort: { createdAt: -1 } }).fetch()[0]?.createdAt || original.createdAt;
      [participant1, participant2].forEach((userId) => {
        updateMyLastSeen._execute({ userId },
          { topicId: originalId, lastSeenInfo: { timestamp } });
      });
      Topics.direct.remove(room._id);
    }); */
  },
});

Migrations.add({
  version: 48,
  name: 'Reposting bills with negative item',
  up() {
    /* Communities.find().forEach(community => {
      const accountingMethod = community.settings.accountingMethod;
      const bills = Transactions.find({ communityId: community._id, category: 'bill', postedAt: { $exists: true },
        'lines.amount': { $lt: 0 }, serialId: { $not: /STORNO$/ } });
      function repost(tx) {
        const updateData = tx.makeJournalEntries(accountingMethod);
        Transactions.direct.update(tx._id, { $set: updateData }, { selector: tx, validate: false });
        tx.updateBalances(-1);
        Transactions.findOne(tx._id).updateBalances(+1);
      }
      bills.forEach(bill => {
        if (bill.status === 'void') {
          const serialId = bill.serialId + '/STORNO';
          const amount = bill.amount * -1;
          const stornoBill = Transactions.findOne({ communityId: community._id, serialId, amount });
          if (stornoBill) repost(stornoBill);
        }
        repost(bill);
      });
    }); */
  },
});

Migrations.add({
  version: 49,
  name: 'Ensure balances are all correct',
  up() {
   // Balances.ensureAllCorrect();
  },
});

Migrations.add({
  version: 50,
  name: 'Recalculate reconciled and outstanding fields on transactions',
  up() {
    /* Transactions.find().forEach(tx => {
      const modifier = {};
      autoValueUpdate(Transactions, tx, modifier, 'reconciled', d => d.calculateReconciled());
      if (tx.calculateOutstanding) {
        autoValueUpdate(Transactions, tx, modifier, 'outstanding', d => d.calculateOutstanding());
      }
      Transactions.direct.update(tx._id, modifier, { selector: tx });
    }); */
  },
});

Migrations.add({
  version: 51,
  name: 'Reposting member bills and payments',
  up() {
    /* const start = new Date("2020-09-01");
    Communities.find().forEach(community => {
      const adminId = community.admin()._id;
      Transactions.find({ communityId: community._id, relation: 'member', status: 'posted', createdAt: { $gte: start } }).forEach(tx => {
        Transactions.methods.post._execute({ userId: adminId }, { _id: tx._id });
      });
    }); */
  },
});

Migrations.add({
  version: 52,
  name: 'Comments get attachments field instead of photo',
  up() {
    /* Comments.find({ photo: { $exists: true } }).forEach(comment => {
      const photos = comment.photo;
      Comments.update(comment._id, { $set: { attachments: photos }, $unset: { photo: '' } }, { selector: comment, validate: false });
    }); */
  },
});

Migrations.add({
  version: 53,
  name: 'Save amount in journal entries',
  up() {
    /* Communities.find().forEach(community => {
      const adminId = community.admin()._id;
      Transactions.find({ communityId: community._id, status: 'posted', category: { $in: ['receipt', 'barter', 'opening', 'transfer'] } }).forEach(tx => {
        Transactions.methods.post._execute({ userId: adminId }, { _id: tx._id });
      });
    }); */
  },
});

Migrations.add({
  version: 54,
  name: 'Txdef paymentSubType',
  up() {
    /* Txdefs.find({ category: 'payment' }).forEach(txdef => {
      const value = txdef.data.remission ? 'remission' : 'payment';
      if (!txdef.data.paymentSubType) {
        Txdefs.direct.update(txdef._id, { $set: { 'data.paymentSubType': value } });
      }
    }); */
  },
});

Migrations.add({
  version: 55,
  name: 'enableMeterEstimationDays',
  up() {
    //  Communities.direct.update({}, { $set: { 'settings.enableMeterEstimationDays': 30 } }, { multi: true });
  },
});

Migrations.add({
  version: 56,
  name: 'Txdef updates',
  up() {
    /* defineTxdefTemplates();
    const template = Templates.findOne('Condominium_Txdefs');
    Communities.find().forEach(community => {
      const communityId = community._id;
      template.txdefs.forEach(txdef => {
        Txdefs.define(_.extend({}, txdef, { communityId }));
      });
    }); */
  },
});

Migrations.add({
  version: 57,
  name: 'Payments from overpayments into separate transactions and fix db inconsistency',
  up() {
    /* Transactions.find({ relation: 'member', category: 'bill', relationAccount: { $ne: '`33' } }).fetch().forEach(tx => {
      Transactions.direct.update(tx._id, { $set: { relationAccount: '`33' } }, { selector: tx, validate: false });
      if (tx.isPosted()) {
        const userId = tx.community().admin()._id;
        Transactions.methods.post._execute({ userId }, { _id: tx._id });
      }
    });
    Transactions.find({ lines: { $exists: true }, 'lines.account': new RegExp('^[^`]') }).fetch().forEach(tx => {
      const newLines = [];
      tx.lines.forEach((line, index) => {
        let account = line.account;
        if (!line.account.startsWith('`')) {
          account = '`' + line.account;
        }
        line.account = account;
        newLines.push(line);
      });
      Transactions.direct.update(tx._id, { $set: { lines: newLines } }, { selector: tx, validate: false });
    });

    Transactions.find({ communityId: 'y38GnfKaWTgsmxrfB', category: 'payment', relation: 'member', status: 'posted' }).fetch().forEach(payment => {
      const olderBills = [];
      const newerBills = [];
      const community = payment.community();
      const userId = community.admin()._id;
      payment.getBills().forEach((bill, index) => {
        const billDoc = Transactions.findOne(bill.id);
        if (billDoc.issueDate.getTime() > payment.valueDate.getTime()) newerBills.push(bill);
        else olderBills.push(bill);
      });
      const preservedLines = [];
      payment.getLines().forEach(line => {
        if (!_.contains(payment.txdef().conteerCodes(), line.account)) {
          if (community.settings.accountingMethod === 'cash') preservedLines.push(line);
          else if (community.settings.accountingMethod === 'accrual' && payment.relation === 'member') preservedLines.push(line);
        }
        if (community.settings.accountingMethod === 'accrual' && payment.relation !== 'member') preservedLines.push(line);
      });
      if (newerBills.length) {
        try {
          Transactions.update({ _id: payment._id }, { $set: { bills: olderBills, lines: preservedLines } }, { selector: payment });
        } catch (err) {
          console.log(err);
          console.log('Payment: ', JSON.stringify(payment));
        }
        if (payment.isPosted()) {
          try {
            Transactions.methods.post._execute({ userId }, { _id: payment._id });
          } catch (err) {
            console.log(err);
            console.log('Payment at post: ', JSON.stringify(payment));
          }
        }
        newerBills.forEach(nB => {
          const newBill = Transactions.findOne(nB.id);
          let newPayment;
          try {
            newPayment = Transactions.insert({
              communityId: newBill.communityId,
              partnerId: newBill.partnerId,
              contractId: newBill.contractId,
              relation: newBill.relation,
              category: 'payment',
              defId: newBill.correspondingIdentificationTxdef()._id,
              valueDate: newBill.issueDate,
              amount: nB.amount,
              payAccount: '`431',
              bills: [nB],
            });
          } catch (err) {
            console.log(err);
            console.log('newPayment - bill on payment, bill in db: ', nB.id, nB.amount, JSON.stringify(newBill));
            console.log('original tx: ', JSON.stringify(payment));
          }
          if (payment.isPosted() && newPayment) {
            try {
              Transactions.methods.post._execute({ userId }, { _id: newPayment });
            } catch (err) {
              console.log(err);
              console.log('newPayment at post: ', JSON.stringify(Transactions.findOne(newPayment)));
              console.log('original tx: ', JSON.stringify(payment));
            }
          }
        });
      } else {
        if (payment.lines?.length) {
          const modifier = preservedLines.length ? { $set: { lines: preservedLines } } : { $unset: { lines: '' } };
          autoValueUpdate(Transactions, payment, modifier, 'outstanding', d => d.calculateOutstanding());
          Transactions.update({ _id: payment._id }, modifier, { selector: payment });
          if (payment.isPosted()) Transactions.methods.post._execute({ userId }, { _id: payment._id });
        }
      }
    }); */
  },
});

Migrations.add({
  version: 58,
  name: 'Remove partner entries',
  up() {
   /*  Communities.find().forEach(community => {
      const userId = community.userWithRole('admin')?._id;
      if (!userId) return;
      Transactions.find({ communityId: community._id, pEntries: { $exists: true } }).fetch().forEach(tx => {
        Transactions.methods.post._execute({ userId }, { _id: tx._id });
        Transactions.direct.update({ _id: tx._id }, { $unset: { pEntries: '' } }, { selector: tx, validate: false });
      });
    });
    Balances.direct.remove({ partner: { $exists: true }, account: '`' });
   */ },
});

Migrations.add({
  version: 59,
  name: 'Ensure freeTxs have amounts on all journal entries',
  up() {
    /* Communities.direct.update({}, { $set: { 'settings.allowPostToGroupAccounts': true } }, { multi: true });
    Transactions.find({ category: 'freeTx' }).fetch().forEach(tx => {
      if (tx.isPosted()) {
        Transactions.methods.post._execute({ userId: tx.community().admin()._id }, { _id: tx._id });
      }
    }); */
  },
});

Migrations.add({
  version: 60,
  name: 'Mark group accounts',
  up() {
    /* Accounts.find({}).forEach(doc => {
      const code = doc.code;
      if (Accounts.find({ communityId: doc.communityId, code: new RegExp('^' + code) }).fetch().length > 1) {
        Accounts.direct.update(doc._id, { $set: { isGroup: true } });
      }
    }); */
  },
});

Migrations.add({
  version: 61,
  name: 'Repost older transactions',
  up() {
   /*  const end = new Date('2020-09-01');
    Communities.find().forEach(community => {
      const userId = community.userWithRole('admin')?._id;
      if (!userId) return;
      Transactions.find({ communityId: community._id, postedAt: { $exists: true }, createdAt: { $lte: end } }).forEach(tx => {
        Transactions.methods.post._execute({ userId }, { _id: tx._id });
      });
    }); */
  },
});

Migrations.add({
  version: 62,
  name: 'No more bank expense',
  up() {
    /* Communities.find().forEach(community => {
      const oldTxdef = Txdefs.findByName('Bank fee expense', community._id);
      if (!oldTxdef) return;
      const newTxdef = Txdefs.getByName('Expense receipt', community._id);
      Transactions.direct.update({ communityId: community._id, defId: oldTxdef._id }, 
        { $set: { defId: newTxdef._id } }, { multi: true });
      Txdefs.direct.remove(oldTxdef._id);
    }); */
  },
});

Migrations.add({
  version: 63,
  name: 'Create accounting periods',
  up() {
    /* Communities.find().forEach(community => {
      const communityId = community._id;
      const balances = Balances.find({ communityId });
      let years = _.filter(balances.map(b => Period.fromTag(b.tag).year), y => y);
      years = _.uniq(_.sortBy(years, y => y), true);
      AccountingPeriods.upsert({ communityId }, { $set: { communityId, years } });
    }); */
  },
});

Migrations.add({
  version: 64,
  name: 'Merge double room topics',
  up() {
    /* Communities.find().forEach(community => {
      const communityId = community._id;
      Topics.find({ communityId, category: 'room' }).forEach((room) => {
        const participant1 = room.participantIds[0];
        const participant2 = room.participantIds[1];
        const original = Topics.find({ communityId, participantIds: { $all: [participant1, participant2] }, title: room.title },
          { sort: { createdAt: 1 } }).fetch()[0];
        const originalId = original._id;
        if (room._id === originalId) return;
        room.comments().forEach((comment) => {
          Comments.update(comment._id, { $set: { topicId: originalId } });
        });
        [participant1, participant2].forEach((userId) => {
          const user = Meteor.users.findOne(userId);
          mergeLastSeen(user, room._id, originalId);
        });
        Topics.direct.remove(room._id);
      });
    }); */
  },
});

Migrations.add({
  version: 65,
  name: 'Communities.settings.ownershipScheme',
  up() {
    /* Communities.direct.update({}, { $set: { 'settings.ownershipScheme': 'condominium' } }, { multi: true });
    Communities.find().forEach(community => {
      const communityId = community._id;
      if (community.totalunits) {
        Communities.direct.update({ _id: communityId }, { $set: { 'settings.totalUnits': community.totalunits } });
        Communities.direct.update({ _id: communityId }, { $unset: { 'totalunits': '' } });        
      }
    }); */
  },
});

Migrations.add({
  version: 66,
  name: 'Contracts.cc',
  up() {
    /* Contracts.find().forEach(contract => {
      if (contract.delegateId) {
        Contracts.direct.update({ _id: contract._id }, { $set: { 'cc': [{ partnerId: contract.delegateId }] } }, { selector: { relation: 'member' } });
        Contracts.direct.update({ _id: contract._id }, { $unset: { 'delegateId': '' } }, { selector: { relation: 'member' } });        
      }
    }); */
  },
});

Migrations.add({
  version: 67,
  name: 'Fix unremoved payments from bills',
  up() {
  },
});

Migrations.add({
  version: 68,
  name: 'Log unremoved payments from bills',
  up() {
    Transactions.find({ category: 'bill' }).forEach(bill => {
      const pids = bill.getPayments();
      pids.forEach(p => {
        if (p.amount === 0) return;
        const payment = Transactions.findOne(p.id);
        if (!payment) {
          console.log("Payment", p.id, "does not exist anymore. Referenced on bill ",  bill._id, bill.serialId);
          return;
        }
        const found = _.find(payment.getBills(), b => b.id === bill._id);
        if (!found) console.log("Payment", payment._id, payment.serialId, "does not have bill ",  bill._id, bill.serialId);
      });
    });
  },
});

Migrations.add({
  version: 69,
  name: 'Reposting bills and payments for cash accounting',
  up() {
/*
    Communities.find({ 'settings.accountingMethod': 'cash' }).fetch().reverse().forEach(community => {
      const adminId = community.admin()._id;
      console.log('Reposting community', community.name);
      const period = AccountingPeriods.findOne({ communityId: community._id });
      if (period) {
        AccountingPeriods.direct.update(period._id, { $unset: { accountingClosedAt: '' } });
      }
      const txs = Transactions.find({ communityId: community._id, category: { $in: ['bill', 'payment'] }, status: 'posted' }).fetch();
      console.log('Tx count in community', txs.length);
      txs.forEach(tx => {
        Transactions.methods.post._execute({ userId: adminId }, { _id: tx._id });
      });
    });
*/
  },
});

Migrations.add({
  version: 70,
  name: 'Reposting bills and payments for cash accounting',
  up() {
    Communities.find({ 'settings.accountingMethod': 'cash' }).fetch().forEach(community => {
      console.log('Reposting community', community.name);
      Accounts.directMove(community._id, '`31', '`031');
      Accounts.directMove(community._id, '`33', '`033');
      Accounts.directMove(community._id, '`454', '`0454');
    });
  },
});

Migrations.add({
  version: 71,
  name: 'Reposting multi leg  payments for cash accounting',
  up() {
/*    Communities.find({ 'settings.accountingMethod': 'cash' }).fetch().forEach(community => {
      const adminId = community.admin()._id;
      console.log('Reposting community', community.name);
      const period = AccountingPeriods.findOne({ communityId: community._id });
      if (period) {
        AccountingPeriods.direct.update(period._id, { $unset: { accountingClosedAt: '' } });
      }
      const bills = Transactions.find({ communityId: community._id, category: 'bill', status: 'posted' }).fetch().filter(bill => bill.getPayments().length >= 2);
      console.log('Bills count in community', bills.length);
      let paymentIds = [];
      bills.forEach(bill => {
        paymentIds = paymentIds.concat(bill.getPayments().map(p => p.id));
      });
      paymentIds = _.uniq(paymentIds);
      console.log('Payments count in community', paymentIds.length);
      paymentIds.forEach(id => {
        if (Transactions.findOne(id)) {
          Transactions.methods.post._execute({ userId: adminId }, { _id: id });
        }
      });
    });
  */
  },
});

Migrations.add({
  version: 72,
  name: 'Sharedfolders becomes part of the template',
  up() {
    const template = Communities.findOne({ name: 'Honline Társasház Sablon', isTemplate: true });
    productionAssert(template, 'Template Not found');
    Sharedfolders.find({}).forEach(sf => {
      if (sf.communityId === null) {
        sf.communityId = template._id;
        sf.content = sf._id;
        const oldFolderId = sf._id; delete sf._id;
        const newFolderId = Sharedfolders.insert(sf);
        Shareddocs.direct.update({ folderId: oldFolderId }, { $set: { folderId: newFolderId } }, { multi: true });
        Sharedfolders.direct.remove(oldFolderId);
      }
    });
    Communities.find({ isTemplate: { $ne: true } }).forEach(community => {
      if (community.settings.templateId !== template._id) {
        Communities.direct.update(community._id, { $set: { 'settings.templateId': template._id } });
      }
    });
  },
});

Migrations.add({
  version: 73,
  name: 'Remove redundant docs in community where Template has the exact same doc',
  up() {
    const template = Communities.findOne({ name: 'Honline Társasház Sablon', isTemplate: true });
    productionAssert(template, 'Template Not found');
    Communities.find({ isTemplate: { $ne: true } }).forEach(community => {
      console.log('Doing community', community.name);
      Accounts.find({ communityId: community._id, category: { $ne: 'bank' } }).forEach(account => {
        const templateVersion = Accounts.findOne({ code: account.code, name: account.name, communityId: template._id });
        if (templateVersion) {
          Accounts.direct.remove(account._id); // we refer to it by the code, so no other updates neccesary
        }
      });
      Parcels.find({ communityId: community._id, category: { $in: ['@group', '#tag'] } }).forEach(localizer => {
        const templateVersion = Parcels.findOne({ code: localizer.code, name: localizer.name, communityId: template._id });
        if (templateVersion) {
          Parcels.direct.remove(localizer._id); // we don't use these yet, so no other updates neccesary
        }
      });
      Txdefs.find({ communityId: community._id }).forEach(txdef => {
        const templateVersion = Txdefs.findOne({ name: txdef.name, communityId: template._id });
        if (templateVersion && _.isEqual(templateVersion.debit, txdef.debit) && _.isEqual(templateVersion.credit, txdef.credit)) {
          Transactions.direct.update({ defId: txdef._id }, { $set: { defId: templateVersion._id } }, { multi: true });
          Txdefs.direct.remove(txdef._id);
        }
      });
    });
  },
});

Migrations.add({
  version: 74,
  name: 'Communities.templateId non-optional',
  up() {
    Communities.find({ isTemplate: true }).forEach(community => {
      Communities.direct.update(community._id, { $set: { 'settings.templateId': 'xQhxdpneEbvT9RuMr' } });
    });
  },
});

Migrations.add({
  version: 75,
  name: 'Notilocalizer becomes ticket localizer',
  up() {
    Topics.find({ category: 'ticket', notiLocalizer: { $exists: true } }).forEach(ticket => {
      console.log('Ticket', ticket._id, 'notiLocalizer', ticket.notiLocalizer, ticket.notiLocalizer[0], 'localizer', ticket.ticket.localizer);
      Topics.direct.update(ticket._id, { $set: { 'ticket.localizer': ticket.notiLocalizer[0] }, $unset: { notiLocalizer: '' } }, { selector: { category: 'ticket' } });
    });
  },
});

Migrations.add({
  version: 76,
  name: 'Closed flag becomes closed status',
  up() {
    Topics.find({ closed: true, status: { $nin: ['closed', 'deleted'] } }).forEach(topic => {
      console.log('Topic', topic.status,  topic);
      Topics.direct.update(topic._id, { $set: { status: 'closed' } }, { selector: { category: 'forum' } });
    });
    Topics.direct.update({}, { $unset: { closed: '' } }, { selector: { category: 'forum' }, multi: true });
  },
});

Migrations.add({
  version: 77,
  name: 'Bill payments cache the payment date',
  up() {
    Transactions.find({ category: 'bill' }).forEach(bill => {
      const pids = bill.getPayments();
      pids.forEach(p => {
        if (p.amount === 0) return;
        const payment = Transactions.findOne(p.id);
        if (!payment) {
          console.log("Payment", p.id, "does not exist anymore. Referenced on bill ",  bill._id, bill.serialId);
          return;
        }
        p.valueDate = payment.valueDate;
      });
      Transactions.direct.update(bill._id, { $set: { payments: bill.payments } }, { selector: { category: 'bill' } });
    });
  },
});

// Use only direct db operations to avoid unnecessary hooks!

// Iterate on fetched cursors, if it runs a long time, because cursors get garbage collected after 10 minutes

Meteor.startup(() => {
  Migrations.unlock();
  Migrations.migrateTo('latest');
});
