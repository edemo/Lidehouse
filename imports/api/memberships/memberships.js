/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { officerRoles, everyRole, Roles } from '/imports/api/permissions/roles.js';
import { Factory } from 'meteor/dburles:factory';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Person, PersonSchema } from '/imports/api/users/person.js';
import { ActivePeriodSchema } from '/imports/api/active-period.js';

export const Memberships = new Mongo.Collection('memberships');

// Parcels can be jointly owned, with each owner having a fractional *share* of it
// each frectional owner can vote with his own fraction,
// or if there is a single *representor*, he can cast votes for the whole parcel.

const OwnershipSchema = new SimpleSchema({
  share: { type: Fraction },
  representor: { type: Boolean, optional: true },
});

const benefactorTypeValues = ['rental', 'favor', 'right'];
const BenefactorshipSchema = new SimpleSchema({
  type: { type: String, allowedValues: benefactorTypeValues, autoform: autoformOptions(benefactorTypeValues) },
});

// Memberships are the Ownerships, Benefactorships and Roleships in a single collection
Memberships.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },  // manager approved this membership
  accepted: { type: Boolean, autoform: { omit: true }, defaultValue: false },  // person accepted this membership
  role: { type: String, allowedValues() { return everyRole; },
    autoform: {
      options() {
        return Roles.find({ name: { $in: officerRoles } }).map(function option(r) { return { label: __(r.name), value: r._id }; });
      },
      firstOption: () => __('(Select one)'),
    },
  },
  person: { type: PersonSchema },
  personId: { type: String, optional: true, autoform: { omit: true },
    autoValue() {
      return this.field('person.userId').value || this.field('person.idCard.identifier').value;
    },
  },
  // TODO should be conditional on role === 'owner'
  ownership: { type: OwnershipSchema, optional: true },
  // TODO should be conditional on role === 'benefactor'
  benefactorship: { type: BenefactorshipSchema, optional: true },
});

Meteor.startup(function indexMemberships() {
  Memberships.ensureIndex({ parcelId: 1 }, { sparse: true });
  Memberships.ensureIndex({ personId: 1 }, { sparse: true });
  if (Meteor.isServer) {
    Memberships._ensureIndex({ communityId: 1, approved: 1, active: 1, role: 1 });
  }
});

// Statuses of members:
// 0. Email not given
// 1. Email given - not yet registered user (maybe later will be invited)
// 2. Email given - not yet registered user, invitation already sent
// 3. Email given - registered user, but email not yet verified [2 and 3 are very similar, as accepting invitation veryfies the email]
// 4. Email given - registered user, with verified email (userId field also set)
// -. idCard not registered
// +. idCard registered
// These are orthogonal. Status of (0+) means: No email given, but has registered idCard.

// A megadott email címmel még nincs regisztrált felhasználó a rendszerben.
// Küldjünk egy meghívót a címre?

Memberships.helpers({
  hasPerson() {
    return !!(this.person);
  },
  Person() {
    debugAssert(this.person);
    return new Person(this.person);
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  parcel() {
    return Tracker.nonreactive(() => {  // parcelId is not changeable on the membership
      const parcel = Parcels.findOne(this.parcelId);
      return parcel;
    });
  },
  totalunits() {
    const community = this.community();
    if (!community) return undefined;
    return community.totalunits;
  },
  isOwnership() {
    if (this.role === 'owner') return true;
    debugAssert(!this.ownership);
    return false;
  },
  hasOwnership() {
    if (this.ownership) {
      debugAssert(this.role === 'owner');
      return true;
    }
    return false;
  },
  isRepresentor() {
    return (this.ownership && this.ownership.representor);
  },
  votingUnits() {
    if (!this.parcel()) return 0;
    if (!this.parcel().approved) return 0;
    const votingUnits = this.isRepresentor() ? this.parcel().units : this.parcel().units * this.ownership.share.toNumber();
    return votingUnits;
  },
  votingShare() {
    if (!this.parcel()) return 0;
    if (!this.parcel().approved) return 0;
    const votingShare = this.isRepresentor() ? this.parcel().share() : this.parcel().share().multiply(this.ownership.share);
    return votingShare;
  },
  toString() {
    let result = __(this.role);
    const parcel = this.parcel();
    if (parcel) result += (' ' + parcel.toString());
    return result;
  },
});

Memberships.attachSchema(Memberships.schema);
Memberships.attachSchema(ActivePeriodSchema);
Memberships.attachSchema(Timestamps);

// TODO: Would be much nicer to put the translation directly on the OwnershipSchema,
// but unfortunately when you pull it into Memberships.schema, it gets copied over,
// and that happens earlier than TAPi18n extra comtype transaltions get added.
Meteor.startup(function attach() {
  Memberships.simpleSchema().i18n('schemaMemberships');
});

Memberships.modifiableFields = [
  'ownership.share',
  'ownership.representor',
  'benefactorship.type',
].concat(PersonSchema.modifiableFields)
.concat(ActivePeriodSchema.fields);

Factory.define('membership', Memberships, {
  communityId: () => Factory.get('community'),
  userId: () => Factory.get('user'),
  role: 'guest',
});
