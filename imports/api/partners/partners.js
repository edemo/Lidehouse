import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Memberships } from '/imports/api/memberships/memberships';
import { ContactSchema } from '/imports/api/users/person.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Partners = new Mongo.Collection('partners');

Partners.relationValues = ['supplier', 'customer', 'parcel'];

const chooseRelation = _.extend(
  { value: () => Session.get('activePartnerRelation') },
  autoformOptions(Partners.relationValues, 'schemaPartners.relation.')
);

Partners.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  relation: { type: String, allowedValues: Partners.relationValues, autoform: chooseRelation },
  name: { type: String, max: 100 },
  bankAccountNumber: { type: String, max: 100, optional: true },
  taxNumber: { type: String, max: 50, optional: true },
  contact: { type: ContactSchema, optional: true },
  // redundant fields:
  outstanding: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true } },
});

/*
Meteor.startup(function indexPartners() {
  Partners.ensureIndex({ communityId: 1, name: 1 });
  if (Meteor.isServer) {
    Partners._ensureIndex({ communityId: 1, relation: 1, outstanding: -1 });
  }
});

Partners.getByName = function getByName(communityId, relation, name) {
  let partnerId;
  let partner = Partners.findOne({ communityId, relation, name });
  if (!partner) {
    partnerId = Partners.insert({ communityId, relation, name });
    partner = Partners.findOne(partnerId);
  }
  return partner;
};
*/
Partners.relCollection = function relCollection(relation) {
  if (relation === 'parcel') return Memberships;
  return Partners;
};

export let choosePartner = {};
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
  
  choosePartner = {
    relation: 'partner',
    value() {
      const selfId = AutoForm.getFormId();
      return ModalStack.readResult(selfId, 'af.partner.insert');
    },
    options() {
      const communityId = Session.get('activeCommunityId');
      const relation = Session.get('activePartnerRelation');
      const partners = Partners.find({ communityId, relation });
      const options = partners.map(function option(c) {
        return { label: c.name, value: c._id };
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
}

Partners.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  toString() {
    return this.name;
  },
});

Partners.attachSchema(Partners.schema);
Partners.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Partners.simpleSchema().i18n('schemaPartners');
});

// --- Factory ---

Factory.define('partner', Partners, {
});

Factory.define('customer', Partners, {
  relation: 'customer',
  name: () => faker.random.word(),
  bankAccountNumber: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  taxNumber: () => faker.finance.account(6) + '-2-42',
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => faker.internet.email(),
  },
});

Factory.define('supplier', Partners, {
  relation: 'supplier',
  name: () => faker.random.word(),
  bankAccountNumber: () => faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  taxNumber: () => faker.finance.account(6) + '-2-42',
  contact: {
    address: () => faker.address.streetAddress('###'),
    phone: () => faker.phone.phoneNumberFormat(1),
    email: () => faker.internet.email(),
  },
});

Factory.define('partner', Partners, {
});
