import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const DEBUG = true;

if (DEBUG) {
  SimpleSchema.debug = true;
}
