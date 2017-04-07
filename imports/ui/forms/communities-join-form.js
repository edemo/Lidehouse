/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
// import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';

import { Communities } from '/imports/api/communities/communities.js';
import { insert as insertMember } from '../../api/members/methods.js';

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
    insertMember.call({ userId: Meteor.userId(), communityId }, (err) => {
      if (err) {
        FlowRouter.go('App.home');
        alert(`${TAPi18n.__('layouts.appBody.newMemberError')}\n${err}`); // eslint-disable-line no-alert
      }
    });
  },
});
