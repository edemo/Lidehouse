import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import './hideable.html';

Template.hideable.viewmodel({
  hider: null,
  onCreated(instance) {
    const userId = Meteor.userId();
    const communityId = Session.get('activeCommunityId');
    this.hider(instance.data.hiddenBy(userId, communityId));
  },
  events: {
    'click .js-show'(event, instance) {
      this.hider(null);
    },
  },
});
