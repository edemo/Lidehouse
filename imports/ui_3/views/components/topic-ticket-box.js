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
import './topic-box.js';
import './topic-ticket-box.html';

Template.Topic_ticket_header.events({
  'click .ticket .js-edit'(event) {
    const id = this._id;
    afTicketUpdateModal(id);
  },
  'click .ticket .js-status'(event) {
    const id = this._id;
    const status = $(event.target).closest('[data-status]').data('status');
    afTicketStatusChangeModal(id, status);
  },
  'click .ticket .js-delete'(event) {
    const id = this._id;
    deleteTicketConfirmAndCallModal(id);
  },
});
