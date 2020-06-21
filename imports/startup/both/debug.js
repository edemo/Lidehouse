import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

if (Meteor.isDevelopment) {
  SimpleSchema.debug = true;
}
