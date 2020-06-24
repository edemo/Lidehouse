import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { allowedOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

const Feedbacks = {};
Feedbacks.typeValues = ['opinion', 'bug', 'feature'];

Feedbacks.extensionSchema = new SimpleSchema({
  type: { type: String, allowedValues: Feedbacks.typeValues, autoform: allowedOptions() },
  rating: { type: Number, optional: true, allowedValues: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
});

Feedbacks.schema = () => Topics.simpleSchema({ category: 'feedback' });
Topics.attachVariantSchema(
  new SimpleSchema({ feedback: { type: Feedbacks.extensionSchema } }),
  { selector: { category: 'feedback' } },
);

Feedbacks.schema().i18n('schemaFeedbacks');
