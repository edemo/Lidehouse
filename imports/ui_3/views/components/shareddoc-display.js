import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';

import './shareddoc-display.html';

Template.Shareddoc_inline.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
});

Template.Shareddoc_inline.events({
  'click .js-delete'() {
    Shareddocs.remove(this._id);
  },
});


//---------------------------


Template.Shareddoc_boxy.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
});
