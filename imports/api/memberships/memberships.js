/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { officerRoles, everyRole, nonOccupantRoles, Roles, ranks } from '/imports/api/permissions/roles.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Person, PersonSchema } from '/imports/api/users/person.js';

export const Memberships = new Mongo.Collection('memberships');

// Memberships are the Ownerships, Benefactorships and Roleships in a single collection
Memberships.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
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
  rank: { type: String, optional: true, allowedValues: ranks, autoform: autoformOptions(ranks) },
  person: { type: PersonSchema },
  personId: { type: String, optional: true, autoform: { omit: true },
    autoValue() {
      return this.field('person.userId').value || this.field('person.idCard.identifier').value || undefined;
    },
  },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } },
});

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

const Ownerships = {};
Ownerships.schema = new SimpleSchema({
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id },
  ownership: { type: OwnershipSchema },
});

const Benefactorships = {};
Benefactorships.schema = new SimpleSchema({
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id },
  benefactorship: { type: BenefactorshipSchema } },
);

Memberships.idSet = ['communityId', 'role', 'parcelId', 'person.idCard.name', 'person.contact.email'];

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

export function entityOf(role) {
  if (role === 'owner') return 'ownership';
  if (role === 'benefactor') return 'benefactorship';
  if (role === 'delegate') return 'delegate';
  return 'roleship';
}

Memberships.helpers({
  entityName() {
    return entityOf(this.role);
  },
  hasPerson() {
    return !!(this.person);
  },
  Person() {
    debugAssert(this.person);
    return new Person(this.person);
  },
  user() {
    debugAssert(this.person.userId);
    return Meteor.users.findOne(this.person.userId);
  },
  community() {
    const community = Communities.findOne(this.communityId);
    debugAssert(community);
    return community;
  },
  parcel() {
    const parcelId = this.parcelId;
    if (!parcelId) return undefined;
    // parcelId is not changeable on the membership, so no need to be reactive here
    return Tracker.nonreactive(() => Parcels.findOne(parcelId));
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
  isRepresentedBySomeoneElse() {
    if (!this.ownership) return false;
    debugAssert(this.parcelId);
    const parcel = Parcels.findOne(this.parcelId);
    const representor = parcel.representor();
    if (!representor || representor._id === this._id) return false;
    return true;
  },
  votingUnits() {
    if (!this.parcel()) return 0;
    if (!this.parcel().approved) return 0;
    const votingUnits = this.isRepresentor() ? this.parcel().ledUnits() : this.parcel().ledUnits() * this.ownership.share.toNumber();
    return votingUnits;
  },
  votingShare() {
    if (!this.parcel()) return 0;
    if (!this.parcel().approved) return 0;
    const votingShare = this.isRepresentor() ? this.parcel().ledShare() : this.parcel().ledShare().multiply(this.ownership.share);
    return votingShare;
  },
  displayRole() {
    let result = __(this.role);
    const parcel = this.parcel();
    if (parcel) result += ` ${parcel.toString()}`;
    return result;
  },
  toString() {
    return `${this.Person().displayName('hu')}, ${this.displayRole()}`;
  },
});

Memberships.attachBaseSchema(Memberships.baseSchema);
Memberships.attachBehaviour(ActivePeriod);
Memberships.attachBehaviour(Timestamped);

Memberships.attachVariantSchema(Ownerships.schema, { selector: { role: 'owner' } });
Memberships.attachVariantSchema(Benefactorships.schema, { selector: { role: 'benefactor' } });
// Memberships.attachVariantSchema(undefined, { selector: { role: { $nin: ['owner', 'benefactor'] } } });
nonOccupantRoles.forEach(role =>
  Memberships.attachVariantSchema(undefined, { selector: { role } })
);

// TODO: Would be much nicer to put the translation directly on the OwnershipSchema,
// but unfortunately when you pull it into Memberships.schema, it gets copied over,
// and that happens earlier than TAPi18n extra comtype transaltions get added.
Meteor.startup(function attach() {
  nonOccupantRoles.forEach(role =>
    Memberships.simpleSchema({ role }).i18n('schemaMemberships')
  );
});

Memberships.publicFields = {
  'person.idCard.address': 0,
  'person.idCard.identifier': 0,
  'person.idCard.mothersName': 0,
  'person.idCard.dob': 0,
  'person.contact': 0,
};

Memberships.modifiableFields = [
  // 'role' and 'parcelId' are definitely not allowed to change! - you should create new Membership in that case
  'ownership.share',
  'ownership.representor',
  'benefactorship.type',
  'personId',
].concat(PersonSchema.modifiableFields);

Factory.define('membership', Memberships, {
  userId: () => Factory.get('user'),
  role: 'guest',
});

Factory.define('roleship', Memberships, {
  userId: () => Factory.get('user'),
  role: 'manager',
});

Factory.define('ownership', Memberships, {
  userId: () => Factory.get('user'),
  role: 'owner',
  ownership: {
    share: new Fraction(1),
  },
});

Factory.define('benefactorship', Memberships, {
  userId: () => Factory.get('user'),
  role: 'benefactor',
  benefactorship: {
    type: 'rental',
  },
});

Factory.define('delegate', Memberships, {
  userId: () => Factory.get('user'),
  role: 'delegate',
});
