import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Fraction } from 'fractional';
import { Tracker } from 'meteor/tracker';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { AccountingLocation } from '/imports/api/behaviours/accounting-location.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { FreeFields } from '/imports/api/behaviours/free-fields.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { ParcelRefFormat } from '/imports/comtypes/house/parcelref-format.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcelships } from '/imports/api/parcelships/parcelships';
import { ActiveTimeMachine } from '../behaviours/active-time-machine';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Parcels = new Mongo.Collection('parcels');

Parcels.categoryValues = ['@property', '@common', '@group', '#tag'];
Parcels.typeValues = ['flat', 'parking', 'storage', 'cellar', 'attic', 'shop', 'other'];

Parcels.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Parcels.categoryValues, autoform: { omit: true } },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  ref: { type: String,    // 1. unique reference within a community (readable by the user)
                          // 2. can be used to identify a parcel, which is not a true parcel, just a sub-part of a parcel
    autoValue() {
      if (!this.isSet) {
        const community = Meteor.isClient ? getActiveCommunity() : Communities.findOne(this.field('communityId').value);
        if (!community || !community.settings.parcelRefFormat) return undefined;
        const doc = { type: this.field('type').value, building: this.field('building').value, floor: this.field('floor').value, door: this.field('door').value };
        return ParcelRefFormat.createRefFromFields(community.settings.parcelRefFormat, doc);
      } else return undefined;
    },
  },
  code: { type: String, optional: true,
    autoValue() {
      if (this.isInsert && !this.isSet) {
        return this.field('category').value.charAt(0) + this.field('ref').value;
      } else return undefined;
    },
  },
});

Parcels.physicalSchema = new SimpleSchema({
  type: { type: String, optional: true, allowedValues: Parcels.typeValues, autoform: autoformOptions(Parcels.typeValues, 'schemaParcels.type.') },
  building: { type: String, max: 10, optional: true },
  floor: { type: String, max: 10, optional: true },
  door: { type: String, max: 10, optional: true },
  lot: { type: String, max: 100, optional: true },
  /* autoValue() {
        if (this.isInsert) return community().lot + '/A/' + serial;
        return undefined;
  */
});

Parcels.propertySchema = new SimpleSchema({
  serial: { type: Number, optional: true },
  leadRef: { type: String, optional: true, autoform: { omit: true } }, // cached active value, if you need TimeMachine functionality use leadParcel() which reads from Parcelships
  units: { type: Number, optional: true },
  group: { type: String, max: 25, optional: true },
  // cost calculation purposes
  area: { type: Number, decimal: true, optional: true },
  volume: { type: Number, decimal: true, optional: true },
  habitants: { type: Number, optional: true },
});

Parcels.idSet = ['communityId', 'ref'];

Meteor.startup(function indexParcels() {
  Parcels.ensureIndex({ communityId: 1, ref: 1 });
  Parcels.ensureIndex({ communityId: 1, leadRef: 1 });
  if (Meteor.isServer) {
    Parcels._ensureIndex({ communityId: 1, code: 1 });
    Parcels._ensureIndex({ lot: 1 });
  }
});

Parcels.helpers({
  entityName() {
    return this.category;
  },
  leadParcelId() {
    if (ActiveTimeMachine.isSimulating()) {
      const parcelship = Parcelships.findOneActive({ parcelId: this._id });
      return parcelship ? parcelship.leadParcelId : this._id; // if can't find your lead parcel, lead yourself
    } else {
      if (!this.leadRef || (this.leadRef === this.ref)) return this._id;
      const leadParcel = Parcels.findOne({ communityId: this.communityId, ref: this.leadRef });
      return leadParcel ? leadParcel._id : this._id;  // if can't find your lead parcel, lead yourself
    }
  },
  leadParcel() {
    return Parcels.findOne(this.leadParcelId());
  },
  leadParcelRef() {
    if (ActiveTimeMachine.isSimulating()) return this.leadParcel().ref;
    else return this.leadRef;
  },
  isLed() {
    const leadRef = this.leadParcelRef();
    return (leadRef && leadRef !== this.ref); // comparing the ref is quicker than the id, because the ref is cached
  },
  followers() {
    if (ActiveTimeMachine.isSimulating()) {
      const followerParcelIds = Parcelships.findActive({ leadParcelId: this._id }).map(ps => ps.parcelId);
      return Parcels.find({ _id: { $in: _.without(followerParcelIds, this._id) } });
    } else return Parcels.find({ _id: { $ne: this._id }, communityId: this.communityId, leadRef: this.ref });
  },
  withFollowers() {
    return [this].concat(this.followers().fetch());
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.door ? this.door : '');
  },
  meters() {
    return Meters.findActive({ communityId: this.communityId, parcelId: this._id });
  },
  oldestReadMeter() {
    return _.last(this.meters().fetch().sort(m => m.lastReading().date.getTime()));
  },
  occupants() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId() });
  },
  owners() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner' });
  },
  representors() {
    return Memberships.findActive({ communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner', 'ownership.representor': true });
  },
  representor() {
    return this.representors().fetch()[0];
  },
  payerMembership() {
    const payer = this.representor() || this.owners().fetch()[0];
    productionAssert('err_invalidData', `Unable to pay for parcel ${this.ref} - no payer membership found`);
    return payer;
  },
  payerPartner() {
    return this.payerMembership().partner();
  },
  display() {
    return `${this.ref || '?'} (${this.location()}) ${__(this.type)}`;
  },
  displayName() {
    return this.location() || __(this.ref);
  },
  displayAccount() {
    return `${this.code}: ${this.displayName()}`;
  },
  toString() {
    return this.ref || this.location();
  },
  community() {
    return Communities.findOne(this.communityId);
  },
  totalunits() {
    const community = this.community();
    return community && community.totalunits;
  },
  // Voting
  ledUnits() {
    let cumulatedUnits = 0;
    this.withFollowers().forEach(parcel => cumulatedUnits += parcel.units);
    return cumulatedUnits;
  },
  share() {
    return new Fraction(this.units, this.totalunits());
  },
  ledShare() {
    return new Fraction(this.ledUnits(), this.totalunits());
  },
  ownedShare() {
    let total = new Fraction(0);
    this.owners().forEach(o => total = total.add(o.ownership.share)); // owners are the lead's owners
    return total;
  },
  isLeaf() {
    return this.category !== 'group';
  },
  asOption() {
    return { label: this.displayAccount(), value: this.code };
  },
});

_.extend(Parcels, {
  // Almost a duplicate of Accounts functions, to use Parcels as localizer
  checkExists(communityId, code) {
    if (!code || !Parcels.findOne({ communityId, code })) {
      throw new Meteor.Error('err_notExists', `No such parcel: ${code}`);
    }
  },
  all(communityId) {
    return Parcels.find({ communityId }, { sort: { code: 1 } });
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Parcels.findOne({ communityId, code });
  },
  getByRef(ref, communityId = getActiveCommunityId()) {
    return Parcels.findOne({ communityId, ref });
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Parcels.find({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  nodeOptionsOf(communityId, codeS, leafsOnly, addRootNode = false) {
    const codes = (codeS instanceof Array) ? codeS : [codeS];
    const nodeOptions = codes.map(code => {
      const nodes = Parcels.nodesOf(communityId, code, leafsOnly);
      return nodes.map(node => node.asOption());
    }).flat(1);
    if (codeS === '') return [{ value: '', label: '' }].concat(nodeOptions);
    return nodeOptions;
  },
  chooseSubNode(code, leafsOnly) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        return Parcels.nodeOptionsOf(communityId, code, leafsOnly);
      },
      firstOption: false,
    };
  },
  choosePhysical: {
    options() {
      const communityId = Session.get('activeCommunityId');
      return Parcels.nodeOptionsOf(communityId, '@', false);
    },
    firstOption: () => __('(Select one)'),
  },
  chooseNode: {
    options() {
      const communityId = Session.get('activeCommunityId');
      return Parcels.nodeOptionsOf(communityId, '', false);
    },
    firstOption: () => __('(Select one)'),
  },
});

Parcels.attachBaseSchema(Parcels.baseSchema);
// Parcels.attachBehaviour(FreeFields);
Parcels.attachBehaviour(AccountingLocation);
Parcels.attachBehaviour(Timestamped);

Parcels.attachVariantSchema(Parcels.physicalSchema, { selector: { category: '@property' } });
Parcels.attachVariantSchema(Parcels.propertySchema, { selector: { category: '@property' } });
Parcels.attachVariantSchema(Parcels.physicalSchema, { selector: { category: '@common' } });
Parcels.attachVariantSchema(undefined, { selector: { category: '@group' } });
Parcels.attachVariantSchema(undefined, { selector: { category: '#tag' } });

Meteor.startup(function attach() {
  Parcels.simpleSchema({ category: '@property' }).i18n('schemaParcels');
  Parcels.simpleSchema({ category: '@common' }).i18n('schemaParcels');
  Parcels.simpleSchema({ category: '@group' }).i18n('schemaParcels');
  Parcels.simpleSchema({ category: '#tag' }).i18n('schemaParcels');
});

// --- Before/after actions ---

function updateCommunity(parcel, revertSign = 1) {
  if (!parcel.type) return;
  const modifier = {}; modifier.$inc = {};
  modifier.$inc[`parcels.${parcel.type}`] = revertSign;
  Communities.update(parcel.communityId, modifier);
}

if (Meteor.isServer) {
  Parcels.after.insert(function (userId, doc) {
    updateCommunity(doc, 1);
  });

  Parcels.before.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, -1);
  });

  Parcels.after.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, 1);
  });

  Parcels.after.remove(function (userId, doc) {
    updateCommunity(doc, -1);
  });
}

// --- Factory ---

Factory.define('parcel', Parcels, {
});

Factory.define('@property', Parcels, {
  category: '@property',
  // serial
  // ref
  // leadRef
  units: 0,
  type: 'flat',
  building: 'A',
  floor: () => faker.random.number(10).toString(),
  door: () => faker.random.number(10).toString(),
  lot: '123456/1234/1',
  area: () => faker.random.number(150),
});

Factory.define('@common', Parcels, {
  category: '@common',
});

Factory.define('@group', Parcels, {
  category: '@group',
});

Factory.define('#tag', Parcels, {
  category: '#tag',
});

// ------------------------------------

export let chooseParcel = () => ({});
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

  chooseParcel = function (code = '') {
    return {
      relation: '#tag',
      value() {
        const selfId = AutoForm.getFormId();
        const value = ModalStack.readResult(selfId, 'af.#tag.insert');
        return value;
      },
      options() {
        const communityId = Session.get('activeCommunityId');
        const parcels = Parcels.nodesOf(communityId, code);
        const options = parcels.map(function option(p) {
          return { label: p.displayAccount(), value: p.code };
        });
        const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
        return sortedOptions;
      },
      firstOption: () => __('Localizers'),
    };
  };
}
