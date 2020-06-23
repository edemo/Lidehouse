import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

/*
const PersonIdentifierSchema = new SimpleSchema({
  name: { type: String },
  dateOfBirth: { type: Date },
  mothersMaidenName: { type: String },
  officialAddress: { type: String },
  officialIdentifier: { type: String }, // szig szam
});

const LegalEntityIdentifierSchema = new SimpleSchema({
  name: { type: String },
  officialAddress: { type: String },
  officialIdentifier: { type: String }, //cegjegyzek szam
});

export const IdCardSchema = new SimpleSchema({
  //  type: { type: String, allowedValues: ['person', 'legal'] },
  person: { type: PersonIdentifierSchema, optional: true },
  legal: { type: LegalEntityIdentifierSchema, optional: true },
});
*/

/*
export function displayName(identifier) {
  let result = '';
  if (identifier.legal) {
    result += identifier.legal.name;
    if (identifier.person) result += `(${identifier.person.firstName} ${identifier.person.lastname})`;
  } else result += `(${identifier.person.firstName} ${identifier.person.lastname})`;
  return result;
}
*/

/* identity witnessing system:
export const Certificates = new Mongo.Collection('certificates');

// A *witness* certificates the *identity* of an entity (person or legal) in a *community*
// can be tied to a *user* account in the system, but not necessarily
Certificates.schema = new SimpleSchema([
  IdentifierSchema,
  {
    witnessId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  },
]);

Certificates.attachSchema(Certificates.schema);
Certificates.attachBehaviour(Timestamped);

Certificates.simpleSchema().i18n('schemaCertificates');

Certificates.allow({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
*/
