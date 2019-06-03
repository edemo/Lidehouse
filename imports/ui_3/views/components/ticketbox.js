import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { like } from '/imports/api/topics/likes.js';
import { flag } from '/imports/api/topics/flags.js';
import { afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal } from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './ticketbox.html';

Template.Ticketbox.onRendered(function ticketboxOnRendered() {
});

Template.Ticketbox.helpers({
});

Template.Ticketbox.events({
  'click .js-edit'(event) {
    const id = this._id;
    afTicketUpdateModal(id);
  },
  'click .js-status'(event) {
    const id = this._id;
    afTicketStatusChangeModal(id);
  },
  'click .js-delete'(event) {
    const id = this._id;
    deleteTicketConfirmAndCallModal(id);
  },
  'click .js-block'(event, instance) {
    flag.call({
      coll: 'users',
      id: instance.data.userId,
    }, handleError);
  },
  'click .js-report'(event, instance) {
    flag.call({
      coll: 'topics',
      id: this._id,
    }, handleError);
  },
  'click .social-body .js-like'(event) {
    like.call({
      coll: 'topics',
      id: this._id,
    }, handleError);
  },
});
