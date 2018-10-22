import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from './communities.js';
import { checkLoggedIn, checkExists, checkNotExists, checkPermissions, checkModifier } from '../method-checks.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkLoggedIn(this.userId);
    checkNotExists(Communities, { name: doc.name });
    const communityId = Communities.insert(doc);
    
    insertPayAccountTemplate(communityId);
    // The user creating the community, becomes the first 'admin' of it.
    Memberships.insert({ communityId, person: { userId: this.userId }, role: 'admin' });
    return communityId;
  },
});

export const update = new ValidatedMethod({
  name: 'communities.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Communities, _id);
    checkModifier(doc, modifier, ['name'], true);     // all fields are modifiable except name
    checkPermissions(this.userId, 'communities.update', _id);
    Communities.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'communities.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const community = checkExists(Communities, _id);
    checkPermissions(this.userId, 'communities.remove', _id);
    // Community cannot be deleted while it has any active officers apart from the admin
    const officers = Memberships.find({ communityId: _id, active: true, role: { $in: officerRoles } });
    if (officers.count() > 1) {
      throw new Meteor.Error('err_unableToRemove', 'Community cannot be deleted while it has active officers',
        `Found: {${officers.count()}}`);
    }
    // Once there are no active officers, the community can be purged
    Communities.remove(_id);
    Parcels.remove({ communityId: _id });
    Memberships.remove({ communityId: _id });
    Agendas.remove({ communityId: _id });
    Topics.remove({ communityId: _id });
    Comments.remove({ communityId: _id });
    Delegations.remove({ communityId: _id });
    // TODO: journals/tramsactions, payaccounts/breakdowns..
  },
});
