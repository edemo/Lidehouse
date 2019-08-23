import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';

import './badge.html';

Template.Badge.helpers({
  countTasks(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    const User = Meteor.user();
    topics.forEach(t => {
      if (User.hasPermission(`${category}.statusChangeTo.${t.status}.leave`)) count += 1;
    });
    return count;
  },
});
