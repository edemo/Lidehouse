import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '/imports/api/communities/communities.js';

export const Notification_Layout = {
  name: 'Notification_Layout',
  path: 'email/notification-layout.html',   // Relative to 'private' dir.
  css: 'email/style.css',
  helpers: {
    user() {
      return Meteor.users.findOne(this.userId);
    },
    community() {
      return Communities.findOne(this.communityId);
    },
    frequencyKey() {
      return 'schemaUsers.settings.notiFrequency.' + Meteor.users.findOne(this.userId).settings.notiFrequency;
    },
    adminEmail() {
      return Communities.findOne(this.communityId).admin().profile.publicEmail;
    },
  },
};
