import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '/imports/api/timestamps.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { autoformOptions } from '/imports/utils/autoform.js';
import { __ } from '/imports/localization/i18n.js';

export const Delegations = new Mongo.Collection('delegations');

Delegations.scopeValues = ['general', 'community', 'agenda', 'topic'];

let chooseUser;
let chooseScopeObject;

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { AutoForm } from 'meteor/aldeed:autoform';

  chooseUser = {
    options() {
      return Meteor.users.find({}).map(function option(u) {
        return { label: u.fullName(), value: u._id };
      });
    },
  };
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
    firstOption: false,
  };
} else {
  chooseUser = {};
  chooseScopeObject = {};
}

Delegations.schema = new SimpleSchema({
  sourceUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseUser },
  targetUserId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseUser },
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
    debugAssert(this.scope === 'general', `No such scope as ${this.scope}`);
    debugAssert(this.scopeObjectId === 'none', 'General scope should not have a corresponding object');
    return undefined;
  },
  sourceUser() {
    return Meteor.users.findOne(this.sourceUserId);
  },
  targetUser() {
    return Meteor.users.findOne(this.targetUserId);
  },
  communityId() {
    if (this.scope === 'community') return this.scopeObjectId;
    if (this.scope === 'agenda') return Agendas.findOne(this.scopeObjectId).communityId;
    if (this.scope === 'topic') return Topics.findOne(this.scopeObjectId).communityId;
    debugAssert(this.scope === 'general', `No such scope as ${this.scope}`);
    debugAssert(this.scopeObjectId === 'none', 'General scope should not have a corresponding object');
    return undefined;
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
