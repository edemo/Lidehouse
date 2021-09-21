import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { __ } from '/imports/localization/i18n.js';
import { allowedOptions } from '/imports/utils/autoform.js';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';

const AutoForm = (Meteor.isClient) ? require('meteor/aldeed:autoform').AutoForm : { getFieldValue: () => undefined };

export const Delegations = new Mongo.Collection('delegations');

Delegations.scopeValues = ['community', 'agenda', 'topic'];

const chooseScopeObject = {
  options() {
    const user = Meteor.user();
    const scope = AutoForm.getFieldValue('scope');
    if (!scope) return [{ label: __('schemaDelegations.scopeObjectId.placeholder'), value: '' }];
    let scopeSet;
    if (scope === 'community') scopeSet = user.communities();
    else {
      const communityId = ModalStack.getVar('communityId');
      if (scope === 'agenda') scopeSet = Agendas.find({ communityId });
      if (scope === 'topic') scopeSet = Topics.find({ communityId, category: 'vote', closed: false, status: { $in: ['announced', 'opened'] } });
    }
    return scopeSet.map(function (o) { return { label: o.name || o.title, value: o._id }; });
  },
  firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
};

function communityIdAutoValue() {
  if (this.isSet || this.operator) return undefined;
  const scope = this.field('scope').value;
  const scopeObjectId = this.field('scopeObjectId').value;
  if (scope === 'community') return scopeObjectId;
  if (scope === 'agenda') return Agendas.findOne(scopeObjectId).communityId;
  if (scope === 'topic') return Topics.findOne(scopeObjectId).communityId;
  return undefined;
}

/*
export const chooseUser = {
  options() {
    const users = Meteor.users.find({});
    const options = users.map(function option(u) {
      return { label: u.displayOfficialName(), value: u._id };
    });
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
  firstOption: () => __('(Select one)'),
};

const PersonIdSchema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  identifier: { type: String, optional: true },
});
*/

Delegations.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoValue: communityIdAutoValue, autoform: { type: 'hidden' } },
  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: _.omit(choosePartner, ['value']) },
  targetId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
  scope: { type: String, allowedValues: Delegations.scopeValues, autoform: allowedOptions() },
  scopeObjectId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseScopeObject },
  sourcePersonId: { type: String, optional: true, autoform: { omit: true } }, // deprecated for sourceId (partner)
  targetPersonId: { type: String, optional: true, autoform: { omit: true } }, // deprecated for targetId (partner)
});

Meteor.startup(function indexDelegations() {
  Delegations.ensureIndex({ sourceId: 1 });
  Delegations.ensureIndex({ targetId: 1 });
  if (Meteor.isServer) {
    Delegations._ensureIndex({ communityId: 1, sourceId: 1 });
  }
});

Delegations.renderScopeObject = function (o) {
  return o ? (o.name || o.title) : '---';
};

Delegations.helpers({
  scopeObject() {
    if (this.scope === 'community') return Communities.findOne(this.scopeObjectId);
    if (this.scope === 'agenda') return Agendas.findOne(this.scopeObjectId);
    if (this.scope === 'topic') return Topics.findOne(this.scopeObjectId);
    return undefined;
  },
  sourcePerson() {
    return Partners.findOne(this.sourceId);
  },
  targetPerson() {
    return Partners.findOne(this.targetId);
  },
  sourceUserId() {
    return Partners.findOne(this.sourceId).userId;
  },
  targetUserId() {
    return Partners.findOne(this.targetId).userId;
  },
  getAffectedVotings() {
    const selector = { category: 'vote', closed: false };
    if (this.scope === 'community') return Topics.find(_.extend({ communityId: this.scopeObjectId }, selector));
    if (this.scope === 'agenda') return Topics.find(_.extend({ communityId: this.communityId, agendaId: this.scopeObjectId }, selector));
    if (this.scope === 'topic') return Topics.find(_.extend({ _id: this.scopeObjectId }, selector));
    return undefined;
  },
  getAffectedOpenVotings() {
    return this.getAffectedVotings()?.fetch().filter(v => v.status === 'opened');
  },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachBehaviour(Timestamped);

Delegations.simpleSchema().i18n('schemaDelegations');

Factory.define('delegation', Delegations, {
  sourceId: () => Factory.get('partner'),
  scope: 'community',
  scopeObjectId: () => Factory.get('community'),
});
