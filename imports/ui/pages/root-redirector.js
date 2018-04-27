import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';

import './root-redirector.html';

Template.app_rootRedirector.onCreated(() => {
  // We need to set a timeout here so that we don't redirect from inside a redirection
  //   which is a no-no in FR.
  Meteor.setTimeout(() => {
    if (Meteor.userId()) {
      if (Session.get('activeCommunityId')) {
        FlowRouter.go('Board');
      } else {
        FlowRouter.go('Communities.join');
      }
    } else {
      FlowRouter.go('App.intro');
    }
  }, 1000);
});
