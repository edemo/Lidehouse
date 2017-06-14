import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Topics } from '../topics.js';
import './rooms.js';

export const join = new ValidatedMethod({
  name: 'rooms.join',
  validate: new SimpleSchema({
    roomId: { type: String, regEx: SimpleSchema.RegEx.Id },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator({ clean: true }),

  run({ roomId, userId }) {
    // const room = Topics.find(roomId);
    Topics.update(roomId, { $push: { participantIds: userId } });
  },
});
