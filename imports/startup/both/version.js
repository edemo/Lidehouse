import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const version = new Date();

export const getVersion = new ValidatedMethod({
  name: 'version.get',
  validate: new SimpleSchema({}).validator(),
  run() {
    return version;
  },
});
