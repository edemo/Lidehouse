import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { autoformOptions, chooseUser, noUpdate } from '/imports/utils/autoform.js';
import { __ } from '/imports/localization/i18n.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

const ContactSchema = new SimpleSchema({
  address: { type: String, optional: true },
  phone: { type: String, optional: true },
  email: {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Email,
    autoValue() {
      if (this.isSet) return (this.value).toLowerCase();
      return undefined;
    },
  },
});

const idCardTypeValues = ['natural', 'legal'];
const IdCardSchema = new SimpleSchema({
  type: { type: String, allowedValues: idCardTypeValues, autoform: autoformOptions(idCardTypeValues, 'schemaMemberships.person.') },
  name: { type: String, optional: true },
  address: { type: String, optional: true },
  identifier: { type: String, optional: true }, // cegjegyzek szam vagy szig szam - unique!!!
  dob: { type: Date, optional: true },  // date of birth/company formation
  mothersName: { type: String, optional: true },
});

export const PersonSchema = new SimpleSchema({
  // *userId* (connecting to a registered user in the system),
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  // *idCard* (identity papers confirmed by manager, so person can officially vote now)
  // this person might or might not wish to register in the system ever, but still can do voting (if manager votes in his name)
  idCard: { type: IdCardSchema, optional: true },
  // Contact details provided by the person - the email address is used for sending invitation to user account creation
  contact: { type: ContactSchema, optional: true },
});

PersonSchema.modifiableFields = [
//  'person.userId',    should not change these once established!
  'person.idCard.type',
  'person.idCard.name',
  'person.idCard.address',
  'person.idCard.identifier',
  'person.idCard.mothersName',
  'person.idCard.dob',
  'person.contact.address',
  'person.contact.phone',
  'person.contact.email',
];

export class Person {
  constructor(data) {
    _.extend(this, data);
  }
  // A personId is either a userId (for registered users) or an idCard identifier (for non-registered users)
  static constructFromId(personId) {
    debugAssert(personId);
    const m = Memberships.findOne({ personId });
    if (m) return new Person(m.person);
    throw new Meteor.Error('Cannot find person with this id', personId);
  }
  id() {
    if (this.userId) return this.userId;
    if (this.idCard) return this.idCard.identifier;
    return undefined;
  }
  user() {
    if (this.userId) return Meteor.users.findOne(this.userId);
    return undefined;
  }
  primaryEmail() {
    if (this.userId && this.user()) return this.user().emails[0].address;
    if (this.contact) return this.contact.email;
    return undefined;
  }
  avatar() {
    if (this.userId && this.user()) return this.user().avatar;
    return '/images/avatars/avatarnull.png';
  }
  displayName(lang) {
    if (this.idCard && this.idCard.name) return this.idCard.name;
    if (this.userId && this.user()) return this.user().displayProfileName(lang);
    if (this.contact && this.contact.email) {
      const emailSplit = this.contact.email.split('@');
      const emailName = emailSplit[0];
      return `[${emailName}]`;
    }
    if (this.userId && !this.user()) return __('deletedUser');
    return __('unknownUser');
  }
  activeRoles(communityId) {
    return _.uniq(Memberships.find({ communityId, approved: true, active: true, personId: this.id() }).fetch().map(m => m.role));
  }
  toString() {
    return this.displayName();
  }
}

export let choosePerson = {};

if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  choosePerson = {
    options() {
      const communityId = Session.get('activeCommunityId');
      let memberships = Memberships.find({ communityId }).fetch().filter(m => m.personId);
      memberships = _.uniq(memberships, false, m => m.personId);
      const options = memberships.map(function option(m) {
        return { label: (m.Person().displayName() + ', ' + m.Person().activeRoles(communityId).map(role => __(role)).join(', ')), value: m.personId };
      });
      const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
      return sortedOptions;
    },
    firstOption: () => __('(Select one)'),
  };
}
