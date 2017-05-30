import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Comments } from '/imports/api/comments/comments.js';

import '../components/votebox.html';
import '../components/comments-section.js';

Template.Votebox.onRendered(function chatboxOnRendered() {
});

Template.Votebox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
  displayTime() {
    return moment(this.vote.closesAt).format('YYYY.MM.DD hh:mm');
  },
  displayTimeLeft() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.vote.closesAt).from(serverTimeNow);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { $sort: { createdAt: 1 } });
  },
});
