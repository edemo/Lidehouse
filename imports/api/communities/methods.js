// import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
// import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from './communities.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator(),
  run(doc) {
    let existingComm = Communities.findOne({ name: doc.name });
    if (!existingComm) {
      existingComm = Communities.insert(doc);
    }
    return existingComm;
  },
});
