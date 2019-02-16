import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';

import './root-redirector.html';

Template.app_rootRedirector.onCreated(() => {
  if (Meteor.userId()) {
    Template.instance().subscribe('memberships.ofUser', { userId: Meteor.userId() });
    Template.instance().autorun(() => {
      if (Template.instance().subscriptionsReady()) {
        if (Session.get('activeCommunityId')) {
          FlowRouter.go('Board');
        } else {
          FlowRouter.go('Communities.listing');
        }
      }
    });
  } else {
      if (Meteor.settings.public.communityId) {
        FlowRouter.go('Community.page', { _cid: Meteor.settings.public.communityId });
      } else {
        FlowRouter.go('App.intro');
      }
  }
});
