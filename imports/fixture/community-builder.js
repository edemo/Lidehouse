/* eslint-disable max-classes-per-file */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { debugAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock';
import { Accounts } from 'meteor/accounts-base';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/accounting/categories';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import '/imports/startup/server/register-api';  // brings all methods
import { runWithFakeUserId, uploadFileSimulation } from './demo-upload';

export class CommunityBuilder {
  constructor(communityId, demoOrTest, lang) {
    this.communityId = communityId;
    this.demoOrTest = demoOrTest;
    this.lang = lang;
    this.com = { en: 'com', hu: 'hu' }[lang];

    const parcels = Parcels.find({ communityId, category: '@property' }, { sort: { serial: -1 } });
    const lastCreatedParcel = parcels.fetch()[0];
    this.nextSerial = (lastCreatedParcel ? lastCreatedParcel.serial : 0) + 1;
    this.dummyUsers = [];
    this.nextUserIndex = 1;
    this.password = Meteor.settings.demoPassword || faker.random.alphaNumeric(10);
  }
  __(text) {
    return TAPi18n.__(text, {}, this.lang);
  }
  community() {
    return Communities.findOne(this.communityId);
  }
  getUserWithRole(role) {
    const member = Memberships.findOneActive({ communityId: this.communityId, role, userId: { $exists: true } });
    if (!member) throw Error(`No user with role ${role} in the community`);
    return member.partner().userId;
  }
  sameUser() {
    return this.dummyUsers[this.nextUserIndex];
  }
  nextUser() {
    this.nextUserIndex += 7; // relative prime
    this.nextUserIndex %= this.dummyUsers.length;
    return this.dummyUsers[this.nextUserIndex];
  }
  findSomeoneWhoCanDo(method) {
    return this.getUserWithRole('admin');
  }
  autoDetermineCreator(method, params) {
    const split = method.name.split('.');
    const collName = split[0], opName = split[1];
    const collection = Mongo.Collection.get(collName);
    // Using the string 'sameUser' means you want to do this with the same user that did the last operation
    if (params.creatorId === null) return this.sameUser();
    switch (opName) {
      case 'update':
      case 'remove': return collection.findOne(params._id).creatorId;
      case 'statusChange': switch (Topics.findOne(params.topicId).category) {
        case 'vote': return this.getUserWithRole('manager');
        case 'ticket': return this.getUserWithRole('maintainer');
        default: return collection.findOne(params._id).creatorId;
      }
      case 'insert': switch (collName) {
        case 'agendas':
        case 'contracts':
        case 'parcels':
        case 'partners':
        case 'meters': return this.getUserWithRole('manager');
        case 'memberships': return this.getUserWithRole('admin');
        case 'statements':
        case 'statementEntries':
        case 'parcelBillings':
        case 'accounts':
        case 'breakdowns':
        case 'txdefs': return this.getUserWithRole('accountant');
        case 'transactions': return (params.category === 'bill' || params.category === 'receipt') ? this.getUserWithRole('treasurer') : this.getUserWithRole('accountant');
        case 'comments': return this.nextUser();
        case 'topics': switch (params.category) {
          case 'vote': switch (params.vote.effect) {
            case 'legal': return this.getUserWithRole('manager');
            case 'poll': this.nextUser(); return this.nextUser();
            default: debugAssert(false, `No such vote.effect ${params.vote.effect}`);
          } break;
          case 'ticket': switch (params.ticket.type) {
            case 'issue': return this.nextUser();
            case 'upgrade': return this.getUserWithRole('manager');
            case 'maintenance': return this.getUserWithRole('maintainer');
            default: debugAssert(false, `No such ticket.type ${params.ticket.type}`);
          } break;
          case 'forum': return this.nextUser();
          case 'news': return this.getUserWithRole('manager');
          case 'room': return this.getUserWithRole('manager');
          default: debugAssert(false, `No such topics.category ${params.category}`);
        } break;
        default: debugAssert(false, `No such collection ${collName}`);
      } break;
      default: return this.findSomeoneWhoCanDo(method);
    }
    return undefined; // never gets here
  }
  build(name, data) {
    const dataExtended = _.extend({ communityId: this.communityId }, data);
    if (name) {
      const doc = Factory.build(name);
      delete doc._id; // for some reason Factory builds an _id onto it
      _.each(dataExtended, (value, key) => Object.setByString(doc, key, value));
      return doc;
    }
    return dataExtended;
  }
  create(name, data) {
    const doc = this.build(name, data);
    const collection = Factory.get(name).collection;
    if (collection._name === 'transactions' && !doc.defId) {
      doc.defId = Txdefs.findOneT({ communityId: this.communityId, category: doc.category, 'data.relation': doc.relation, 'data.side': doc.side })._id;
    }
    return this.execute(collection.methods.insert, doc);
  }
  execute(method, params, executorId) {
    const creatorId = executorId || params.creatorId || this.autoDetermineCreator(method, params);
    return method._execute({ userId: creatorId }, params);
  }
  insert(collection, docType, data) {
    const doc = this.build(docType, data);
    return this.execute(collection.methods.insert, doc);
  }
  createProperty(data) {
    _.extend(data, {
      category: '@property',
      serial: this.nextSerial,
//      ref, autovalue
      lot: '4532/8/A/' + this.nextSerial.toString(),
      building: 'A',
      volume: 3 * (data.area || 0),
    });

    this.nextSerial += 1;
    return this.create('property', data);
  }
  createLoginableUser(role, userData, membershipData) {
    const emailAddress = `${role}@${this.demoOrTest}.${this.com}`;
    const userId = Accounts.createUser({ email: emailAddress, password: this.password, language: this.lang });
    Meteor.users.update(userId, { $set: {
      'emails.0.verified': true,
      profile: {
        lastName: this.__(`demo.${role}.lastName`),
        firstName: this.__(`demo.${role}.firstName`),
        publicEmail: `${role}@${this.demoOrTest}.${this.com}`,
        bio: this.__(`demo.${role}.bio`),
      },
    } });
    if (userData) Meteor.users.update(userId, { $set: userData });
    if (role === 'admin') this.adminId = userId;
    this.createMembership(userId, role, membershipData);
    return userId;
  }
  createDummyUser() {
    const userNo = this.dummyUsers.length;
    const lastName = this.__(`demo.user.${userNo}.lastName`);
    const firstName = this.__(`demo.user.${userNo}.firstName`);
    const userId = Meteor.users.insert({
      emails: [{
        address: `${userNo}.dummyuser@${this.demoOrTest}.${this.com}`,
        verified: true,
      }],
      profile: { lastName, firstName },
      avatar: `/images/avatars/avatar${userNo}.jpg`,
      settings: { language: this.lang },
    });
    this.dummyUsers.push(userId);
    return userId;
  }
  createFakeUser(i) {
    return Accounts.createUser({
      email: `${faker.name.lastName()}_${i}@${this.demoOrTest}.${this.com}`,
      password: this.password,
      language: this.lang,
    });
  }
  createFakePerson(i) {
    return {
      userId: this.createFakeUser(i),
      idCard: { type: 'natural', name: faker.name.findName() },
      contact: { phone: faker.phone.phoneNumber() },
    };
  }
  createMembership(personSpec, role, membershipData) {
    let person;
    if (typeof personSpec === 'number') person = { userId: this.dummyUsers[personSpec] };
    else if (typeof personSpec === 'string') person = { userId: personSpec };
    else if (typeof personSpec === 'object') person = personSpec;
    else debugAssert(false);
    let partnerId;
    if (person.userId) {
      const user = Meteor.users.findOne(person.userId);
      const partner = Partners.findOne({ communityId: this.communityId, userId: person.userId });
      if (partner) partnerId = partner._id;
      else person.idCard = { type: 'natural', name: user.displayProfileName(user.settings.language) };
    }
    if (!partnerId) {
      person.communityId = this.communityId;
      person.relation = ['member'];
      debugAssert(person.idCard);
      partnerId = Partners.insert(person);
    }
    const membershipId = Memberships.insert({ communityId: this.communityId, userId: person.userId, partnerId, accepted: true, role, ...membershipData });
    return membershipId;
  }
  serial2code(serial) {
    const parcel = Parcels.findOne({ communityId: this.communityId, serial });
    return parcel.code;
  }
  generateDemoPayments(parcel, membership, count = 12) {
    Clock.starts(1, 'year', 'ago');
    for (let mm = 1; mm <= count; mm++) {
      this.execute(ParcelBillings.methods.apply, {
        communityId: this.communityId,
        date: Clock.currentDate(),
        localizer: parcel.code,
      });
      this.payBillsOf(membership);
      Clock.tick(1, 'month');
    }
    Clock.clear();
  }
  payBill(bill) {
    if (bill.hasConteerData() && !bill.isPosted()) {
      this.execute(Transactions.methods.post, { _id: bill._id }, this.getUserWithRole('accountant'));
    }
/*    const paymentId = this.create('payment', {
      bills: [{ id: bill._id, amount: bill.outstanding }],
      valueDate: Clock.currentDate(),
      amount: bill.outstanding,
      payAccount: '381',
    });*/
    const entryId = this.create('statementEntry', {
      account: this.community().primaryBankAccount().code,
      valueDate: bill.dueDate,
      name: bill.partner().getName(),
      note: bill.serialId,
      amount: bill.outstanding,
    });
    this.execute(StatementEntries.methods.recognize, { _id: entryId }, this.getUserWithRole('accountant'));
    this.execute(StatementEntries.methods.autoReconcile, { _id: entryId }, this.getUserWithRole('accountant'));
  }
  payBillsOf(membership) {
    const unpaidBills = Transactions.find({ communityId: this.communityId, category: 'bill', relation: 'member', partnerId: membership.partnerId, outstanding: { $ne: 0 } });
    unpaidBills.forEach(bill => this.payBill(bill));
  }
  everybodyPaysTheirBills() {
    const unpaidBills = Transactions.find({ communityId: this.communityId, category: 'bill', relation: 'member', outstanding: { $ne: 0 } });
    unpaidBills.forEach(bill => this.payBill(bill));
  }
  postAllTransactions() {
    const toPost = Transactions.find({ communityId: this.communityId, postedAt: { $exists: false } });
    this.execute(Transactions.methods.batch.post, { args: toPost.map(t => ({ _id: t._id })) }, this.getUserWithRole('accountant'));
  }
  insertLoadsOfFakeMembers(parcelCount, insertDemoPayments) {
    if (Parcels.find({ communityId: this.communityId }).count() >= parcelCount) return;
    for (let i = 0; i <= parcelCount; i++) {
      Clock.starts(1, 'year', 'ago');
      const parcelId = this.createProperty({
        floor: '9',
        door: i.toString(),
        area: faker.random.number({ min: 30, max: 200 }),
        type: this.__('schemaParcels.type.flat'),
      });
      const membershipId = this.createMembership(this.createFakePerson(i), 'owner', {
        parcelId,
        approved: true, // !!(serial % 2),
        accepted: !!(i + 1),
        ownership: { share: new Fraction(1, 1) },
      });
      const meterId1 = this.create('meter', {
        parcelId,
        service: this.__('schemaMeters.service.coldWater'),
        uom: 'm3',
      });
      const meterId2 = this.create('meter', {
        parcelId,
        service: this.__('schemaMeters.service.heating'),
        uom: 'kJ',
      });

      if (insertDemoPayments) {
        Clock.clear();
        const parcel = Parcels.findOne(parcelId);
        const membership = Memberships.findOne(membershipId);
        this.generateDemoPayments(parcel, membership);
      }
    }
  }
  uploadShareddoc(fileSpec) {
    const managerId = this.getUserWithRole('manager');
    runWithFakeUserId(managerId, () => {
      uploadFileSimulation({
        communityId: this.communityId,
        userId: managerId,
        name: fileSpec.name[this.lang] || fileSpec.name,
        type: fileSpec.type,
        folderId: fileSpec.folder,
        topicId: fileSpec.topicId,
      }, fileSpec.file[this.lang] || fileSpec.file);
    });
  }
}

export class DemoCommunityBuilder extends CommunityBuilder {
  constructor(communityId, lang) {
    super(communityId, 'demo', lang);
  }
  demoUsersList() {
    return Meteor.users.find({ 'emails.0.address': { $regex: `demouser@demo.${this.com}` } },
      { sort: { createdAt: -1 } });
  }
  createDemoUser(parcelId) {
    const lastDemoUser = this.demoUsersList().fetch()[0];
    const lastDemoUserCounter = lastDemoUser ? Number(lastDemoUser.emails[0].address.split('.')[0]) : 0;
    const demoUserId = Accounts.createUser({
      email: `${lastDemoUserCounter + 1}.${parcelId}.demouser@demo.${this.com}`,
      password: 'password',
      language: this.lang,
    });
    const firstNames = this.__('demo.user.firstNames').split('\n');
    const nameCounter = lastDemoUserCounter % 20;
    Meteor.users.update({ _id: demoUserId }, {
      $set: {
        'emails.0.verified': true,
        avatar: '/images/avatars/avatarnull.png',
        profile: { lastName: this.__('guest').capitalize(), firstName: firstNames[nameCounter] },
      },
    });
    return demoUserId;
  }
  parcelIdOfDemoUser(user) {
    return user.emails[0].address.split('.')[1];
  }
}
