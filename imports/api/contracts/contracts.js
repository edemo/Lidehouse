import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { __ } from '/imports/localization/i18n.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Partners, choosePartner } from '/imports/api/transactions/partners/partners.js';
import { Topics } from '/imports/api/topics/topics.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Contracts = new Mongo.Collection('contracts');

Contracts.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, autoform: { rows: 8 } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: choosePartner },
});

Contracts.helpers({
  partner() {
    return Partners.findOne(this.partnerId);
  },
  worksheets() {
    return Topics.find({ communityId: this.communityId, 'ticket.contractId': this._id });
  },
});

Contracts.attachSchema(Contracts.schema);
Contracts.attachBehaviour(Timestamped);
Contracts.attachBehaviour(ActivePeriod);

Meteor.startup(function attach() {
  Contracts.simpleSchema().i18n('schemaContracts');
});

export const chooseContract = {
  relation: 'contract',
  value() {
    return Session.get('modalResult-af.contract.insert');
  },
  options() {
    const communityId = Session.get('activeCommunityId');
    const contracts = Contracts.find({ communityId });
    const options = contracts.map(function option(c) {
      return { label: c.title, value: c._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

Factory.define('contract', Contracts, {
  title: () => `Contract with ${faker.random.word()}`,
});
