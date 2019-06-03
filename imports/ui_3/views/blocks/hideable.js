import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import './hideable.html';

Template.hideable.viewmodel({
  doShow: false,
  hider() {
    const userId = Meteor.userId();
    const communityId = Session.get('activeCommunityId');
    return this.templateInstance.data.hiddenBy(userId, communityId);
  },
  events: {
    'click .js-show'(event, instance) {
      this.doShow(true);
    },
  },
});
