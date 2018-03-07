import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions, chooseUser } from '/imports/utils/autoform.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export class Person {
  // A personId is either a userId (for registered users) or an idCard identifier (for non-registered users)
  constructor(personId) {
    this.id = personId;
    const u = Meteor.users.findOne(personId);
    if (u) this.user = u;
    const m = Memberships.findOne({ 'idCard.identifier': personId });
    if (m) this.idCard = m.idCard;
  }

  displayName() {
    if (this.idCard) return this.idCard.name;
    if (this.user) return this.user.displayName();
    return '---';
  }

  toString() {
    return this.displayName();
  }
}

export const choosePerson = {
  options() {
    const memberships = Memberships.find().fetch();
    return memberships.map(function option(m) {
      return { label: m.displayName(), value: m.personId() };
    });
  },
};

const idCardTypeValues = ['person', 'legal'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, allowedValues: idCardTypeValues, autoform: autoformOptions(idCardTypeValues) },
  name: { type: String },
  address: { type: String },
  identifier: { type: String }, // cegjegyzek szam vagy szig szam - egyedi!!!
  mothersName: { type: String, optional: true },
  dob: { type: Date, optional: true },
});

export const PersonSchema = new SimpleSchema({
  // The user is connected with the membership via 3 possible ways: userId (registered user),
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  // userEmail (not registered, but invitation is sent)
  userEmail: { type: String, regEx: SimpleSchema.RegEx.Email, optional: true },
  // idCard (confirmed identity papers)
  idCard: { type: IdCardSchema, optional: true },
});

