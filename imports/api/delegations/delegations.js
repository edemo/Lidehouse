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

Delegations.scopeValues = ['general', 'community', 'agenda', 'topic'];

let chooseScopeObject = {}; // on server side, we can't import Session or AutoForm (client side packages)
if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { AutoForm } from 'meteor/aldeed:autoform';

  chooseScopeObject = {
    options() {
      const user = Meteor.user();
      const scope = AutoForm.getFieldValue('scope', 'af.delegation.insert')
                || AutoForm.getFieldValue('scope', 'af.delegation.update');
      if (scope === 'general' || !scope) return [{ label: __('Not applicable'), value: 'none' }];
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
  const scope = this.field('scope').value;
  const scopeObjectId = this.field('scopeObjectId').value;
  if (scope === 'community') return scopeObjectId;
  if (scope === 'agenda') return Agendas.findOne(scopeObjectId).communityId;
  if (scope === 'topic') return Topics.findOne(scopeObjectId).communityId;
  debugAssert(scope === 'general', `No such scope as ${scope}`);
  debugAssert(scopeObjectId === 'none', 'General scope should not have a corresponding object');
  return undefined;
}

/*
const PersonIdSchema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseUser },
  identifier: { type: String, optional: true },
});
*/

Delegations.schema = new SimpleSchema({
  // Either a registered user's userId or a non-registered user's idCard.identifier
  sourcePersonId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: choosePerson },
  targetPersonId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: choosePerson },
  scope: { type: String, allowedValues: Delegations.scopeValues, autoform: autoformOptions(Delegations.scopeValues, 'schemaDelegations.scope.') },
  scopeObjectId: { type: String, /* regEx: SimpleSchema.RegEx.Id,*/ autoform: chooseScopeObject },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoValue: communityIdAutoValue, autoform: { omit: true } },
});

Delegations.renderScopeObject = function (o) {
  return o ? (o.name || o.title) : '---';
};

Delegations.helpers({
  scopeObject() {
    if (this.scope === 'community') return Communities.findOne(this.scopeObjectId);
    if (this.scope === 'agenda') return Agendas.findOne(this.scopeObjectId);
    if (this.scope === 'topic') return Topics.findOne(this.scopeObjectId);
    debugAssert(this.scope === 'general', `No such scope as ${this.scope}`);
    debugAssert(this.scopeObjectId === 'none', 'General scope should not have a corresponding object');
    return undefined;
  },
  sourcePerson() {
    return Person.constructFromId(this.sourcePersonId);
  },
  targetPerson() {
    return Person.constructFromId(this.targetPersonId);
  },
});

Delegations.attachSchema(Delegations.schema);
Delegations.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Delegations.simpleSchema().i18n('schemaDelegations');
});

// Deny all client-side updates since we will be using methods to manage this collection
Delegations.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
