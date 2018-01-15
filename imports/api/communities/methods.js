import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { insertPayAccountTemplate } from '/imports/api/payaccounts/template.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from './communities.js';
import { checkLoggedIn, checkNotExists, checkPermissions } from '../method-checks.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkLoggedIn(this.userId);
    checkNotExists(Communities, { name: doc.name });
    const communityId = Communities.insert(doc);
    
    insertPayAccountTemplate(communityId);
    // The user creating the community, becomes the first 'admin' of it.
    Memberships.insert({ communityId, userId: this.userId, role: 'admin' });
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
    checkPermissions(this.userId, 'communities.update', _id);
    // all fields are modifiable
    Communities.update({ _id }, modifier);
  },
});
