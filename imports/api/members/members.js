import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

class MembersCollection extends Mongo.Collection {
  insert(member, callback) {
    const ourMember = member;
    if (!ourMember.userId) {
      ourMember.userId = Meteor.userId();
    }
    if (!ourMember.username) {
      const email = Meteor.user().emails[0].address;
      ourMember.username = email.substring(0, email.indexOf('@'));
    }
    return super.insert(ourMember, callback);
  }
}

export const Members = new MembersCollection('members');

// Deny all client-side updates since we will be using methods to manage this collection
Members.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Members.schema = new SimpleSchema({
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  username: {
    type: String,
    max: 20,
  },
});

Members.attachSchema(Members.schema);

// This represents the keys from Member objects that should be published
// to the client. If we add secret properties to Member objects, don't list
// them here to keep them private to the server.
Members.publicFields = {
  userId: 1,
  username: 1,
};

Factory.define('member', Members, {});
