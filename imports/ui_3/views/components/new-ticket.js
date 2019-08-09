import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import './new-ticket.html';

Template.New_Ticket.viewmodel({
  ticketTypes() {
    return Tickets.typeValues;
  },
});
