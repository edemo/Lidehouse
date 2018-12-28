import { SimpleSchema } from 'meteor/aldeed:simple-schema';

DEBUG = true;   // global variable

if (DEBUG) {
  SimpleSchema.debug = true;
}
