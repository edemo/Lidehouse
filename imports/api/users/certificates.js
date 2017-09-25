import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';

export const Certificates = new Mongo.Collection('certificates');

const PersonIdentifierSchema = new SimpleSchema({
  firstName: { type: String },
  lastName: { type: String },
  dateOfBirth: { type: Date },
  mothersMaidenName: { type: String },
  officialAddress: { type: String },
  officialIdentifier: { type: String },
});

const LegalEntityIdentifierSchema = new SimpleSchema({
  name: { type: String },
  officialAddress: { type: String },
  officialIdentifier: { type: String },
});

export const UserIdentifierSchema = new SimpleSchema({
  //  type: { type: String, allowedValues: ['person', 'legal'] },
  person: { type: PersonIdentifierSchema, optional: true },
  legal: { type: LegalEntityIdentifierSchema, optional: true },
});

// A *witness* certificates the *identity* of an entity (person or legal) in a *community*
// can be tied to a *user* account in the system, but not necessarily
Certificates.schema = new SimpleSchema([
  UserIdentifierSchema,
  {
    witnessId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  },
]);

Certificates.attachSchema(Certificates.schema);
Certificates.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Certificates.simpleSchema().i18n('schemaCertificates');
});

Certificates.allow({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
