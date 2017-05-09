
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';

import './community-data-page.html';

Template.Community_data_page.onCreated(function () {
  this.getCommunityId = () => FlowRouter.getParam('_cid');
});

Template.Community_data_page.helpers({
  community() {
    const communityId = Template.instance().getCommunityId();
    return Communities.findOne({ _id: communityId });
  },
  communities() {
    return Communities;
  },
});
