import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';

import './shareddoc-display.html';

Template.Shareddoc_display.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
  uploadDate() {
    return moment(this.createdAt).format('L');
  },
});

Template.Shareddoc_display.events({
  'click .js-delete'() {
    Shareddocs.remove(this._id);
  },
});
