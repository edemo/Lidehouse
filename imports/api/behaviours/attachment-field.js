import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { attachmentUpload } from '/imports/utils/autoform.js';

const schema = new SimpleSchema({
  attachments: { type: Array, optional: true },
  'attachments.$': { type: String, optional: true, autoform: attachmentUpload() },
});

schema.i18n('schemaAttachmentField');

const publicFields = {
  attachments: 1,
};

const modifiableFields = ['attachments'];

const helpers = {
};

function hooks(collection) {
  if (Meteor.isServer) {
    return {
      before: {
        update(userId, doc, fieldNames, modifier, options) {
          if (modifier.$set?.attachments && modifier.$set.attachments.includes(null)) {
            const cleanedList = modifier.$set.attachments.filter(el => el !== null);
            modifier.$set.attachments = cleanedList;
          }
          return true;
        },
      },
      after: {
        insert(userId, doc) {
          const uploadIds = [];
          doc.attachments?.forEach((path) => {
            const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
            if (uploaded) uploadIds.push(uploaded._id);
          });
          uploadIds.forEach(id => Attachments.update(id, { $set: { parentId: doc._id } }));
          return true;
        },
        update(userId, doc, fieldNames, modifier, options) {
          const uploadIds = [];
          modifier.$set?.attachments?.forEach((path) => {
            const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
            if (uploaded && !uploaded.parentId) uploadIds.push(uploaded._id);
          });
          uploadIds.forEach(id => Attachments.update(id, { $set: { parentId: doc._id } }));
  /*         if (modifier.$unset?.attachments) {
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


export const AttachmentField = { name: 'AttachmentField',
  schema, publicFields, modifiableFields, helpers, hooks,
};
