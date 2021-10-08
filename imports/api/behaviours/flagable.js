import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { _ } from 'meteor/underscore';
import { checkExists, checkPermissions } from '/imports/api/method-checks.js';
import { toggleElementInArray } from '/imports/api/utils.js';

const schema = new SimpleSchema({
  flags: { type: Array, defaultValue: [], autoform: { omit: true } },
  'flags.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
});

const helpers = {
  getFlags() {
    return this.flags || [];
  },
  isFlaggedBy(userId) {
    return _.contains(this.getFlags(), userId);
  },
  flagsCount() {
    return this.getFlags().length;
  },
  flaggedBy(userId, communityId) {
    const Communities = Mongo.Collection.get('communities');
    const community = Communities.findOne(communityId);
    if (community.settings.communalModeration > 0 && this.flagsCount() >= community.settings.communalModeration
      /* && this.flagsCount() >= this.likesCount() */) {
      return 'community';
    }
    let result;
    this.getFlags().forEach((flaggerId) => {
      if (flaggerId === userId) result = 'you';
      const flagger = Meteor.users.findOneOrNull(flaggerId);
      if (flagger.hasPermission('flag.forOthers', { communityId })) result = 'moderator';
    });
    return result;
  },
};

const flag = new ValidatedMethod({
  name: 'flag',
  validate: new SimpleSchema({
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ id }) {
    const collectionName = this.name.split('.')[0];
    const collection = Mongo.Collection.get(collectionName);
    const doc = checkExists(collection, id);
    const userId = this.userId;

    if (doc.communityId) { // A user for example does not have a community()
      checkPermissions(userId, 'flag.toggle', doc);
    }

    // toggle Flag status of this user
    toggleElementInArray(collection, id, 'flags', userId);
  },
});

export const Flagable = { name: 'Flagable',
  schema, helpers, methods: { flag }, hooks: {},
};
