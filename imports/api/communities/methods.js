import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
// import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from './communities.js';
// import { Members } from '../members/members.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator(),
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
    Meteor.call('members.insert', { userId: this.userId, communityId });

    return communityId;
  },
});
