import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { attachmentUpload } from '/imports/utils/autoform.js';

export const AttachmentField = function (photoOnly) {
  let fieldName = 'attachments';
  if (photoOnly) fieldName = 'photo';
  const fieldNameElem = fieldName + '.$';

  const schema = new SimpleSchema({
    [fieldName]: { type: Array, optional: true },
    [fieldNameElem]: { type: String, optional: true, autoform: attachmentUpload() },
  });

  schema.i18n('schemaAttachmentField');

  const publicFields = {
    [fieldName]: 1,
  };

  const modifiableFields = [fieldName];

  const helpers = {
    firstAttachment() {
      return this.attachments?.[0];
    }
  };

  function hooks(collection) {
    if (Meteor.isServer) {
      return {
        before: {
          update(userId, doc, fieldNames, modifier, options) {
            if (modifier.$set?.fieldName && modifier.$set.fieldName.includes(null)) {
              const cleanedList = modifier.$set.fieldName.filter(el => el !== null);
              modifier.$set.fieldName = cleanedList;
            }
            return true;
          },
        },
        after: {
          insert(userId, doc) {
            const uploadIds = [];
            doc[fieldName]?.forEach((path) => {
              const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
              if (uploaded) uploadIds.push(uploaded._id);
            });
            uploadIds.forEach(id => Attachments.update(id, { $set: { parentId: doc._id, parentCollection: collection._name } }));
            return true;
          },
          update(userId, doc, fieldNames, modifier, options) {
            const uploadIds = [];
            modifier.$set?.[fieldName]?.forEach((path) => {
              const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
              if (uploaded && !uploaded.parentId) uploadIds.push(uploaded._id);
            });
            uploadIds.forEach(id => Attachments.update(id, { $set: { parentId: doc._id, parentCollection: collection._name } }));
    /*         if (modifier.$unset?.fieldName) {
              if (doc._id) Attachments.remove({ communityId: doc.communityId, parentId: doc.id });
            }); */ // droka:autoform-ufs package removes the uploaded files before submitting the form
            return true;
          },
    /*       remove(userId, doc) {
            if (doc._id) Attachments.remove({ parentId: doc.id });
            return true;
          }, */
        },
      };
    }
  }
  return {
    name: 'AttachmentField',
    schema, publicFields, modifiableFields, helpers, hooks,
  };
};
