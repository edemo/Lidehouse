import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { __ } from '/imports/localization/i18n.js';
import { autoformOptions } from '/imports/utils/autoform.js';

import { Person, choosePerson } from '/imports/api/users/person.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';

export const Delegations = new Mongo.Collection('delegations');

Delegations.scopeValues = ['community', 'agenda', 'topic'];

let chooseScopeObject = {}; // on server side, we can't import Session or AutoForm (client side packages)
if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { AutoForm } from 'meteor/aldeed:autoform';

  chooseScopeObject = {
    options() {
      const user = Meteor.user();
      const scope = AutoForm.getFieldValue('scope', 'af.delegation.insert')
                || AutoForm.getFieldValue('scope', 'af.delegation.update');
      if (!scope) return [{ label: __('schemaDelegations.scopeObjectId.placeholder'), value: 'none' }];
      let scopeSet;
      if (scope === 'community') scopeSet = user.communities();
      else {
        const communityId = Session.get('activeCommunityId');
        if (scope === 'agenda') scopeSet = Agendas.find({ communityId });
        if (scope === 'topic') scopeSet = Topics.find({ communityId, category: 'vote', closed: false });
      }
      return scopeSet.map(function (o) { return { label: o.name || o.title, value: o._id }; });
    },
    firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
  };
}

function communityIdAutoValue() {
  if (this.isSet || this.operator) return;
  const scope = this.field('scope').value;
  const scopeObjectId = this.field('scopeObjectId').value;
  if (scope === 'community') return scopeObjectId;
  if (scope === 'agenda') return Agendas.findOne(scopeObjectId).communityId;
  if (scope === 'topic') return Topics.findOne(scopeObjectId).communityId;
  debugAssert(false, `No such scope as ${scope}`);
  return;
}

/*
const PersonIdSchema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  identifier: { type: String, optional: true },
});
*/

Delegations.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoValue: communityIdAutoValue, autoform: { omit: true } },
  // PersonId is either a registered user's userId or a non-registered user's idCard.identifier
  sourcePersonId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: choosePerson },
  targetPersonId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: choosePerson },
  scope: { type: String, allowedValues: Delegations.scopeValues, autoform: autoformOptions(Delegations.scopeValues, 'schemaDelegations.scope.') },
  scopeObjectId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: chooseScopeObject },
});

Delegations.renderScopeObject = function (o) {
  return o ? (o.name || o.title) : '---';
};

Delegations.helpers({
  scopeObject() {
    if (this.scope === 'community') return Communities.findOne(this.scopeObjectId);
    if (this.scope === 'agenda') return Agendas.findOne(this.scopeObjectId);
    if (this.scope === 'topic') return Topics.findOne(this.scopeObjectId);
    debugAssert(false, `No such scope as ${this.scope}`);
    return undefined;
  },
  sourcePerson() {
    return Person.constructFromId(this.sourcePersonId);
  },
  targetPerson() {
    return Person.constructFromId(this.targetPersonId);
  },
  getAffectedVotings() {
    if (this.scope === 'community') return Topics.find({ communityId: this.scopeObjectId, category: 'vote', closed: false });
    if (this.scope === 'agenda') return Topics.find({ agendaId: this.scopeObjectId, category: 'vote', closed: false });
    if (this.scope === 'topic') return Topics.find({ _id: this.scopeObjectId, category: 'vote', closed: false });
    debugAssert(false, `No such scope as ${this.scope}`);
    return undefined;
  },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Delegations.simpleSchema().i18n('schemaDelegations');
});
