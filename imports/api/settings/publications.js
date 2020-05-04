/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Settings } from './settings.js';

// Everyone has access to all of his own stuff automatically
Meteor.publish(null, function selfSettings() {
  return Settings.find({ userId: this.userId });
});
