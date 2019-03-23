import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Images = new Mongo.Collection('images');

Images.hasPermissionToUpload = function hasPermissionToUpload(userId, doc) {
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('images.upload', doc.communityId, doc);
};

Images.hasPermissionToRemoveUploaded = function hasPermissionToRemoveUploaded(userId, doc) {
  if (Meteor.isServer) return true;
  if (!userId) return false;
  const user = Meteor.users.findOne(userId);
  return user.hasPermission('images.remove', doc.communityId, doc);
};

// Can be manipulated only through the ImagesStore interface
Images.allow({
  insert() { return false; },
  update() { return false; },
  remove(userId, doc) {
    return Images.hasPermissionToRemoveUploaded(userId, doc);
  },
});
