import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { $ } from 'meteor/jquery';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal } from '/imports/ui_3/views/components/tickets-edit.js';
import { Topics } from '/imports/api/topics/topics.js';
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
    const status = $(event.target).data('status');
    afTicketStatusChangeModal(id, status);
  },
  'click .js-delete'(event) {
    const id = this._id;
    deleteTicketConfirmAndCallModal(id);
  },
  'click .js-block'(event, instance) {
    Meteor.users.methods.flag.call({ id: instance.data.creatorId }, handleError);
  },
  'click .js-report'(event, instance) {
    Topics.methods.flag.call({ id: this._id }, handleError);
  },
  'click .social-body .js-like'(event) {
    Topics.methods.like.call({ id: this._id }, handleError);
  },
});
