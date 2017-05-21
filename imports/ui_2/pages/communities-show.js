
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';

import './communities-show.html';

Template.Communities_show_page.onCreated(function communitiesShowPageOnCreated() {
  this.communityId = () => FlowRouter.getParam('_cid');

  this.autorun(() => {
    this.subscribe('communities.listing');
  });
});

Template.Communities_show_page.helpers({
  community() {
    return Communities.findOne({ _id: FlowRouter.getParam('_cid') });
  },
  communities() {
    return Communities;
  },
});
