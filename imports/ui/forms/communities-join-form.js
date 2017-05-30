/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
// import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';

import { Communities } from '/imports/api/communities/communities.js';
import { insert as insertMembership } from '../../api/memberships/methods.js';

import './communities-join-form.html';

Template.Communities_join_form.onCreated(function onCreated() {
  this.subscribe('communities.listing');
});

Template.Communities_join_form.helpers({
  communities() {
    return Communities.find({});
  },
});

Template.Community_listed.events({
  'click button'(event, instance) {
    const communityId = instance.data.community._id;
    insertMembership.call({ userId: Meteor.userId(), communityId, role: 'guest' }, (err) => {
      if (err) {
        FlowRouter.go('App.home');
        alert(`${TAPi18n.__('layouts.appBody.newMembershipError')}\n${err}`); // eslint-disable-line no-alert
      }
    });
  },
});
