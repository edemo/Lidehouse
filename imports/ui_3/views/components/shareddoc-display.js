import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import '/imports/api/shareddocs/actions.js';
import './shareddoc-display.html';

Template.Shareddoc_inline.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
  isNew() {
    return this.uploadedAt?.getDay() === (new Date()).getDay();
  },
  userHasPermissionToRemoveUploaded() {
    return Shareddocs.hasPermissionToRemoveUploaded(Meteor.userId(), this);
  },
});

Template.Shareddoc_inline.events({
  'click .js-delete'(event) {
    const a = $(event.target).closest('.file-item').find('a');
    const _id = a.data('id');
    Shareddocs.actions.delete({}, { _id }).run();
  },
});

//---------------------------

Template.Shareddoc_boxy.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
  userHasPermissionToRemoveUploaded() {
    return Shareddocs.hasPermissionToRemoveUploaded(Meteor.userId(), this);
  },
  shortened(name, maxLengt) {
    if (name.length <= maxLengt) return name;
    const halfLength = Math.floor(maxLengt / 2);
    return `${name.slice(0, halfLength)}...${name.slice((-1) * halfLength)}`;
  },
});

Template.Shareddoc_boxy.events({
  'click .js-delete'(event) {
    const a = $(event.target).closest('div').find('a');
    const _id = a.data('id');
    Shareddocs.actions.delete({}, { _id }).run();
  },
});
