import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { comtype } from '/imports/comtypes/comtype.js';
import { displayAddress } from '/imports/localization/localization.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';

export const Communities = new Mongo.Collection('communities');

const defaultAvatar = '/images/defaulthouse.jpg';

Communities.schema = new SimpleSchema([
  { name: { type: String, max: 100 } },
  { description: { type: String, max: 1200, optional: true } },
  { avatar: { type: String, /* regEx: SimpleSchema.RegEx.Url,*/ defaultValue: defaultAvatar } },
  comtype.profileSchema,
  { totalunits: { type: Number } },
]);

Communities.publicFields = {
  totalunits: 0,
};

Communities.helpers({
  registeredUnits() {
    let total = 0;
    Parcels.find({ communityId: this._id }).forEach(p => total += p.units);
    return total;
  },
  displayAddress() {
    return displayAddress(this);
  },
  admin() {
    return Memberships.findOne({ communityId: this._id, active: true, role: 'admin' });
  },
  users() {
    const users = Memberships.find({ communityId: this._id, active: true, 'person.userId': { $exists: true } }).map(m => m.user());
    return _.uniq(users, false, u => u._id);
  },
  remove() {
    Topics.find({ communityId: this._id }).forEach(topic => topic.remove());
    Agendas.remove({ communityId: this._id });
    Parcels.remove({ communityId: this._id });
    ParcelBillings.remove({ communityId: this._id });
    Payments.remove({ communityId: this._id });
    PayAccounts.remove({ communityId: this._id });
    Memberships.remove({ communityId: this._id });
    Communities.remove({ _id: this._id });
  },
});

Communities.attachSchema(Communities.schema);
Communities.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Communities.simpleSchema().i18n('schemaCommunities');
});

Factory.define('community', Communities, {
  name: () => faker.lorem.sentence(),
  totalunits: 10000,
});
