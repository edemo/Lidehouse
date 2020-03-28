import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';

import './community-join.html';

Template.Community_join.onRendered(function onRendered() {
  const communityId = FlowRouter.getParam('_cid');
  const community = Communities.findOne(communityId);
  //  Template exists just to have shareable link to perform this action
  Communities.actions.join({}, community).run();
});
