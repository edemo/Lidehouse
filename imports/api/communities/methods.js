import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from './communities.js';
import { Memberships } from '../memberships/memberships.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (!this.userId) {
      throw new Meteor.Error('error.notLoggedIn.createCommunity',
        'Only logged in users can create communities.');
    }

    const existingComm = Communities.findOne({ name: doc.name });
    if (existingComm) {
      throw new Meteor.Error('error.alreadyExist.community',
        'Community already exist.');
    }

    const communityId = Communities.insert(doc);

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
    Communities.update({ _id }, modifier);
  },
});
