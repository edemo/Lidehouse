import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

const schema = new SimpleSchema({
  notes: { type: String, optional: true, autoform: { rows: 3 } },
});
schema.i18n('schemaNoted');

const helpers = {
  choppedNotes() {
    return this.notes?.substring(0, 25);
  },
};

export const Noted = { name: 'Noted',
  schema, helpers,
};
