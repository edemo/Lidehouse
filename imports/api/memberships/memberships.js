/* eslint no-param-reassign: "off" */
/* eslint func-names: ["error", "as-needed"] */
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests
import { Factory } from 'meteor/dburles:factory';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { officerRoles, everyRole, nonOccupantRoles, Roles } from '/imports/api/permissions/roles.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { noUpdate } from '/imports/utils/autoform.js';
import { Parcels, chooseProperty } from '/imports/api/parcels/parcels.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Contracts } from '../contracts/contracts';

export const Memberships = new Mongo.Collection('memberships');

// Memberships are the Ownerships, Benefactorships and Roleships in a single collection
Memberships.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },  // manager approved this membership
  accepted: { type: Boolean, autoform: { omit: true }, defaultValue: false },  // person accepted this membership
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...noUpdate, ...choosePartner } },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  role: { type: String, allowedValues() { return everyRole; },
    autoform: _.extend({}, noUpdate, {
      options() {
        return Roles.find({ name: { $in: officerRoles } }).map(function option(r) { return { label: __(r.name), value: r._id }; });
      },
      firstOption: () => __('(Select one)'),
    }),
  },
});

// Parcels can be jointly owned, with each owner having a fractional *share* of it
// each frectional owner can vote with his own fraction,
// or if there is a single *representor*, he can cast votes for the whole parcel.

const OwnershipSchema = new SimpleSchema({
  share: { type: Fraction, defaultValue: new Fraction(1) },
  representor: { type: Boolean, optional: true },
});

const benefactorTypeValues = ['rental', 'favor', 'right'];
const BenefactorshipSchema = new SimpleSchema({
  type: { type: String, allowedValues: benefactorTypeValues, autoform: allowedOptions() },
});

const Ownerships = {};
Ownerships.schema = new SimpleSchema({
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden', relation: 'property' } },
  ownership: { type: OwnershipSchema },
  role: { type: String, defaultValue: 'owner', autoform: { type: 'hidden', defaultValue: 'owner' } },
});

const Benefactorships = {};
Benefactorships.schema = new SimpleSchema({
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden', relation: 'property' } },
  benefactorship: { type: BenefactorshipSchema },
  role: { type: String, defaultValue: 'benefactor', autoform: { type: 'hidden', defaultValue: 'benefactor' } },
});

const Officerships = {};
Officerships.schema = new SimpleSchema({
  rank: { type: String, max: 25, optional: true },
});

const Delegateships = {};
Delegateships.schema = new SimpleSchema({
  role: { type: String, defaultValue: 'delegate', autoform: { type: 'hidden', defaultValue: 'delegate' } },
});

Memberships.idSet = [['communityId', 'role', 'parcelId', 'partnerId']];

Memberships.modifiableFields = [
  // 'role' and 'parcelId' are definitely not allowed to change! - you should create new Membership in that case
  'rank',
  'ownership',
  'ownership.share',
  'ownership.representor',
  'benefactorship',
  'benefactorship.type',
];

Memberships.publicFields = {
  // fields come from behaviours
};

Meteor.startup(function indexMemberships() {
  Memberships.ensureIndex({ parcelId: 1 }, { sparse: true });
  Memberships.ensureIndex({ userId: 1 }, { sparse: true });
  Memberships.ensureIndex({ partnerId: 1 });
  if (Meteor.isServer) {
    Memberships._ensureIndex({ communityId: 1, parcelId: 1, approved: 1, active: 1, role: 1 });
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
  community() {
    return Communities.findOne(this.communityId);
  },
  partner() {
    if (!this.partnerId) return undefined;
    return Partners.findOne(this.partnerId);
  },
  contract() {
    return Contracts.findOneActive({ partnerId: this.partnerId, parcelId: this.parcelId });
  },
  user() {
    debugAssert(this.userId);
    return Meteor.users.findOne(this.userId);
  },
  parcel() {
    if (!this.parcelId) return undefined;
    // parcelId is not changeable on the membership, so no need to be reactive here
    return Tracker.nonreactive(() => Parcels.findOne(this.parcelId));
  },
  isRepresentor() {
    return (this.ownership && this.ownership.representor);
  },
  isVoting() {
    if (!this.ownership) return false;
    debugAssert(this.parcelId);
    const parcel = Parcels.findOne(this.parcelId);
    if (parcel.isLed()) return false;
    const representor = parcel.representor();
    if (representor && representor._id !== this._id) return false;
    return true;
  },
  votingUnits() {
    const parcel = this.parcel();
    if (!parcel) return 0;
    if (!parcel.approved) return 0;
    if (parcel.isLed()) return 0;
    const votingUnits = this.isRepresentor() ? parcel.ledUnits() : parcel.ledUnits() * this.ownership.share.toNumber();
    return votingUnits;
  },
  votingShare() {
    const parcel = this.parcel();
    if (!parcel) return 0;
    if (!parcel.approved) return 0;
    if (parcel.isLed()) return 0;
    const votingShare = this.isRepresentor() ? parcel.ledShare() : parcel.ledShare().multiply(this.ownership.share);
    return votingShare;
  },
  displayRole() {
    let result = __(this.role);
    const parcel = this.parcel(); // TODO Cannot always retrive parcel, needs to subscribe to parcel data
    if (parcel) result += ` ${parcel.toString()}`;
    return result;
  },
  toString() {
    const partner = this.partner();
    const display = `${partner && partner.displayName('hu')}, ${this.displayRole()}`;
    return display;
  },
});

Memberships.attachBaseSchema(Memberships.baseSchema);
Memberships.attachBehaviour(ActivePeriod);
Memberships.attachBehaviour(Timestamped);

Memberships.attachVariantSchema(Ownerships.schema, { selector: { role: 'owner' } });
Memberships.attachVariantSchema(Benefactorships.schema, { selector: { role: 'benefactor' } });
officerRoles.forEach(role =>
  Memberships.attachVariantSchema(Officerships.schema, { selector: { role } })
);
Memberships.attachVariantSchema(Delegateships.schema, { selector: { role: 'delegate' } });
Memberships.attachVariantSchema(undefined, { selector: { role: 'guest' } });

// TODO: Would be much nicer to put the translation directly on the OwnershipSchema,
// but unfortunately when you pull it into Memberships.schema, it gets copied over,
// and that happens earlier than TAPi18n extra comtype transaltions get added.
nonOccupantRoles.forEach((role) => {
  Memberships.simpleSchema({ role }).i18n('schemaMemberships');
});

// --- Before/after actions ---

if (Meteor.isServer) {
  Memberships.before.insert(function (userId, doc) {
    // If partner is provided, userId is being copied over, to have direct access to it
    if (!doc.userId && doc.partnerId) {
      const partner = Partners.findOne(doc.partnerId);
      doc.userId = partner.userId;
    }
    // If partner is not provided, it can be created automatically
    if (doc.userId && !doc.partnerId) {
      const partnerObject = { communityId: doc.communityId, relation: ['member'], userId: doc.userId };
      const partner = Partners.findOne(partnerObject);
      const user = Meteor.users.findOne(doc.userId);
      partnerObject.contact = { email: user.getPrimaryEmail() };
      doc.partnerId = partner ? partner._id : Partners.insert(partnerObject);
    }
  });

  Memberships.before.update(function (userId, doc, fieldNames, modifier, options) {
  });

  Memberships.after.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform(doc);
    const contract = tdoc.contract();
    if (contract) {  // keep contract's (active time) in sync
      try { // throws Error: After filtering out keys not in the schema, your modifier is now empty
        Contracts.update(contract._id, modifier, { selector: { relation: 'member' } });
      } catch (err) {}
    }
  });

  Memberships.after.remove(function (userId, doc) {
    const tdoc = this.transform(doc);
    const contract = tdoc.contract();
    if (contract) Contracts.remove(contract._id);
  });
}

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
