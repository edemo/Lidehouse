import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDP } from 'meteor/ddp';
import { TAPi18n } from 'meteor/tap:i18n';
import faker from 'faker';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from 'meteor/accounts-base';
import { Communities } from '/imports/api/communities/communities.js';
import { update as updateCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
// import { TxDefs } from '/imports/api/transactions/tx-defs.js';
import '/imports/api/transactions/breakdowns/methods.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { insert as insertParcelBilling } from '/imports/api/transactions/batches/methods.js';
import { insert as insertTx } from '/imports/api/transactions/methods.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import { Clock } from '/imports/utils/clock';

export class FixtureBuilder {
  constructor(communityId, demoOrTest, lang) {
    this.communityId = communityId;
    this.demoOrTest = demoOrTest;
    this.lang = lang;
    this.com = { en: 'com', hu: 'hu' }[lang];

    const parcels = Parcels.find({ communityId }, { sort: { createdAt: -1 } });
    const lastCreatedParcel = parcels.fetch()[0];
    this.nextSerial = (lastCreatedParcel ? lastCreatedParcel.serial : 0) + 1;
    this.dummyUsers = [];
  }
  __(text) {
    return TAPi18n.__(text, {}, this.lang);
  }
  community() {
    return Communities.findOne(this.communityId);
  }
  createParcel(doc) {
    const ref = 'A' + doc.floor + doc.door;
    const volume = 3 * (doc.area || 0);
    _.extend(doc, {
      communityId: this.communityId,
      serial: this.nextSerial,
      ref,
      lot: '4532/8/A/' + this.nextSerial.toString(),
      building: 'A',
      volume,
    });

    const registeredUnits = this.community().registeredUnits();
    const newUnits = doc.units;
    const totalunits = this.community().totalunits;
    if (registeredUnits + newUnits > totalunits) {
      Communities.update({ _id: this.communityId }, { $set: { totalunits: (totalunits + newUnits) } });
    }

    const id = Parcels.insert(doc);
    this.nextSerial += 1;
    return id;
  }
  createLoginableUser(role, userData, membershipData) {
    const emailAddress = `${role}@${this.demoOrTest}.${this.com}`;
    const userId = Accounts.createUser({ email: emailAddress, password: 'password', language: this.lang });
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
    const mId = Memberships.insert({ communityId: this.communityId, person: { userId }, accepted: true, role });
    if (membershipData) Memberships.update(mId, { $set: membershipData });
    return userId;
  }
  createDummyUser() {
    const userNo = this.dummyUsers.length;
    const lastName = this.__(`demo.user.${userNo}.lastName`);
    const firstName = this.__(`demo.user.${userNo}.firstName`);
    const userId = Meteor.users.insert({
      emails: [{
        address: `${userNo}.${this.demoOrTest}.${this.lang}.dummyuser@honline.hu`,
        verified: true,
      }],
      profile: { lastName, firstName },
      avatar: `/images/avatars/avatar${userNo}.jpg`,
      settings: { language: this.lang },
    });
    this.dummyUsers.push(userId);
    return userId;
  }
  addRoleToUser(userNoOrId, role, membershipData) {
    const userId = (typeof userNoOrId === 'number') ? this.dummyUsers[userNoOrId] : userNoOrId;
    const mId = Memberships.insert({ communityId: this.communityId, person: { userId }, accepted: true, role });
    if (membershipData) Memberships.update(mId, { $set: membershipData });
    return mId;
  }
  name2code(breakdownName, nodeName) {
    return Breakdowns.name2code(breakdownName, nodeName, this.communityId);
  }
  serial2code(serial) {
    const parcel = Parcels.findOne({ communityId: this.communityId, serial });
    return Localizer.parcelRef2code(parcel.ref);
  }
  generateDemoPayments(parcel) {
    const accountantId = Memberships.findOne({ communityId: this.communityId, role: 'accountant' }).person.userId;

    for (let mm = 1; mm < 13; mm++) {
      const valueDate = new Date('2017-' + mm + '-' + _.sample(['04', '05', '06', '07', '08', '11']));
      insertParcelBilling._execute({ userId: accountantId }, {
        communityId: this.communityId,
        valueDate,
        projection: 'perArea',
        amount: 275,
        payinType: this.name2code('Owner payin types', 'Közös költség előírás'),
        localizer: Localizer.parcelRef2code(parcel.ref),
      });
      insertTx._execute({ userId: accountantId }, {
        communityId: this.communityId,
        valueDate,
        amount: 275 * parcel.area,
        credit: [{
          account: this.name2code('Assets', 'Közös költség előírás'),
          localizer: Localizer.parcelRef2code(parcel.ref),
        }],
        debit: [{
          account: this.name2code('Assets', 'Folyószámla'),
        }],
      });
    }
  }
  insertLoadsOfDummyData(parcelCount) {
    if (Parcels.find({ communityId: this.communityId }).count() >= parcelCount) return;

    for (let i = 0; i < parcelCount; i++) {
      const parcelId = this.createParcel({
        units: 0,
        floor: faker.random.number(10).toString(),
        door: faker.random.number(10).toString(),
        type: 'flat',
        area: faker.random.number(150),
      });
      const parcel = Parcels.findOne(parcelId);
      const membershipId = Memberships.insert({
        communityId: this.communityId,
        parcelId,
        approved: !!(i % 2),
        accepted: !!(i + 1),
        role: 'owner',
        person: {
          userId: Accounts.createUser({
            email: `${faker.name.lastName()}_${i}@${this.demoOrTest}.${this.com}`,
            password: 'password',
            language: this.lang,
          }),
          idCard: { type: 'natural', name: faker.name.findName(), },
          contact: { phone: faker.phone.phoneNumber() },
        },
        ownership: { share: new Fraction(1, 1) },
      });

      Localizer.addParcel(this.communityId, parcel, this.lang);

      this.generateDemoPayments(parcel);
    }
  }

}

export class DemoFixtureBuilder extends FixtureBuilder {
  constructor(communityId, lang) {
    super(communityId, 'demo', lang);
  }
  demoUsersList() {
    return Meteor.users.find({ 'emails.0.address': { $regex: `${this.lang}demouser@honline.hu` } },
      { sort: { createdAt: -1 } });
  }
  createDemoUser(parcelId) {
    const lastDemoUser = this.demoUsersList().fetch()[0];
    const lastDemoUserCounter = lastDemoUser ? Number(lastDemoUser.emails[0].address.split('.')[0]) : 0;
    const demoUserId = Accounts.createUser({
      email: `${lastDemoUserCounter + 1}.${parcelId}.${this.lang}demouser@honline.hu`,
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
