import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { autosetActiveCommunity } from '/imports/ui_3/lib/active-community.js';

import './root-redirector.html';

Template.app_rootRedirector.onCreated(() => {
  if (Meteor.userId()) {
    Template.instance().subscribe('memberships.ofUser', { userId: Meteor.userId() });
    Template.instance().autorun(() => {
      autosetActiveCommunity();
    });
    Template.instance().autorun(() => {
      if (Template.instance().subscriptionsReady()) {
        if (ModalStack.getVar('communityId')) {
          FlowRouter.go('Board');
        } else {
          FlowRouter.go('Communities list');
        }
      }
    });
  } else {
    if (Meteor.settings.public.communityId) {
      Meteor.setTimeout(() => {
        FlowRouter.go('Community show', { _cid: Meteor.settings.public.communityId });
      });
    } else {
      Meteor.setTimeout(() => {
        FlowRouter.go('App intro');
      });
    }
  }
});
