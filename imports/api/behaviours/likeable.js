import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { _ } from 'meteor/underscore';
import { checkExists, checkPermissions } from '/imports/api/method-checks.js';
import { toggleElementInArray } from '/imports/api/utils.js';

const schema = new SimpleSchema({
  likes: { type: Array, defaultValue: [], autoform: { omit: true } },
  'likes.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
});

const helpers = {
  getLikes() {
    return this.likes || [];
  },
  isLikedBy(userId) {
    return _.contains(this.likes, userId);
  },
  likesCount() {
    return this.getLikes().length;
  },
  likeStrength() {
    // A number between 100 and 1000, matching CSS font-weight scale. Normal font-weight is 400. 
    return Math.min(400 + this.likesCount() * 100, 1000); 
  },
  likerNames() {
    let result = '';
    this.getLikes().forEach((userId, i) => {
      const user = Meteor.users.findOne(userId);
      if (i > 0) result += '\n';
      result += user?.displayOfficialName();
    });
    return result;
  },
  /* To update, you need to call the 'like' meteormethod
  toggleLike(userId) {
    const index = _.indexOf(this.likes, userId);
    if (index >= 0) this.likes.splice(index, 1);
    else this.likes.push(userId);
  },*/
};

const like = new ValidatedMethod({
  name: 'like',
  validate: new SimpleSchema({
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ id }) {
    const collectionName = this.name.split('.')[0];
    const collection = Mongo.Collection.get(collectionName);
    const doc = checkExists(collection, id);
    const userId = this.userId;

    if (doc.communityId) { // A user for example does not have a community()
      checkPermissions(userId, 'like.toggle', doc);
    }

    // toggle Like status of this user
    toggleElementInArray(collection, id, 'likes', userId);
  },
});

export const Likeable = { name: 'Likeable',
  schema, helpers, methods: { like }, hooks: {},
};
