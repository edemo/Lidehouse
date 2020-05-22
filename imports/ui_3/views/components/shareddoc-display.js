import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { remove as removeShareddocs } from '/imports/api/shareddocs/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import './shareddoc-display.html';

Template.Shareddoc_inline.helpers({
  completed() {
    return Math.round(this.progress * 100);
  },
  userHasPermissionToRemoveUploaded() {
    return Shareddocs.hasPermissionToRemoveUploaded(Meteor.userId(), this);
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
    Modal.confirmAndCall(removeShareddocs, { _id }, {
      action: 'delete shareddoc',
      message: 'It will disappear forever',
    });
  },
});
