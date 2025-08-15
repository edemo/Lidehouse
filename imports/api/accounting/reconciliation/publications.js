import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Recognitions } from './recognitions.js';

Meteor.publish('recognitions.ofCommunity', function (params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('statements.reconcile', { communityId })) {
    return this.ready();
  }

  return Recognitions.find({ communityId });
});
