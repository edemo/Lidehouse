import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { attachmentUpload } from '/imports/utils/autoform.js';

const schema = new SimpleSchema({
  photo: { type: Array, optional: true },
  'photo.$': { type: String, optional: true, autoform: attachmentUpload() },
});

schema.i18n('schemaAttachmentField');

const publicFields = {
  photo: 1,
};

const modifiableFields = ['photo'];

const helpers = {
};

function hooks(collection) {
  return {
    before: {
      update(userId, doc, fieldNames, modifier, options) {
        if (modifier.$set?.photo && modifier.$set.photo.includes(null)) {
          const cleanedList = modifier.$set.photo.filter(el => el !== null);
          modifier.$set.photo = cleanedList;
        }
        return true;
      },
    },
    after: {
      insert(userId, doc) {
        const uploadIds = [];
        doc.photo?.forEach((path) => {
          const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
          if (uploaded) uploadIds.push(uploaded._id);
        });
        uploadIds.forEach(id => Attachments.update(id, { $set: { topicId: doc._id } }));
        return true;
      },
      update(userId, doc, fieldNames, modifier, options) {
        const uploadIds = [];
        modifier.$set?.photo?.forEach((path) => {
          const uploaded = Attachments.findOne({ communityId: doc.communityId, path });
          if (uploaded && !uploaded.topicId) uploadIds.push(uploaded._id);
        });
        uploadIds.forEach(id => Attachments.update(id, { $set: { topicId: doc._id } }));
/*         if (modifier.$unset?.photo) {
          if (doc._id) Attachments.remove({ communityId: doc.communityId, topicId: doc.id });
        }); */ // droka:autoform-ufs package removes the uploaded files before submitting the form
        return true;
      },
/*       remove(userId, doc) {
        if (doc._id) Attachments.remove({ topicId: doc.id });
        return true;
      }, */
    },
  };
}


export const AttachmentField = { name: 'AttachmentField',
  schema, publicFields, modifiableFields, helpers, hooks,
};
