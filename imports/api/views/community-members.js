import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Memberships } from '/imports/api/memberships/memberships.js';

class CommunityMembersCollection extends Mongo.Collection {
  find(selector) {
    return super.find(selector);
  }
  insert(doc, callback) {
    return super.insert(doc, callback);
  }
  update(selector, modifier) {
    return super.update(selector, modifier);
  }
  remove(selector) {
    return super.remove(selector);
  }
}

export const CommunityMembers = new CommunityMembersCollection('communityMembers');

CommunityMembers.schema = new SimpleSchema({
  members: { type: Array },
  'members.$': { type: Memberships.schema },
});

CommunityMembers.attachSchema(CommunityMembers.schema);
