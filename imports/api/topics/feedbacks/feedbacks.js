import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

const typeValues = ['opinion', 'bug', 'feature'];

const feedbacksExtensionSchema = new SimpleSchema({
  type: { type: String, allowedValues: typeValues, autoform: autoformOptions(typeValues) },
  rating: { type: Number, decimal: true, optional: true, allowedValues: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
});

Topics.helpers({
});

Topics.attachSchema({ feedback: { type: feedbacksExtensionSchema, optional: true } });

_.extend(Topics.publicFields, { feedback: 1 });

export const feedbacksSchema = new SimpleSchema([
  { feedback: { type: feedbacksExtensionSchema, optional: true } },
  Topics.schema,
]);

Meteor.startup(function attach() {
  feedbacksSchema.i18n('schemaFeedback');   // translation is different from schemaTopics
});
