import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

const schema = new SimpleSchema({
  notes: { type: String, optional: true, autoform: { rows: 3 } },
});
Meteor.startup(() => schema.i18n('schemaNoted'));

const helpers = {
};

export const Noted = { name: 'Noted',
  schema, helpers,
};
