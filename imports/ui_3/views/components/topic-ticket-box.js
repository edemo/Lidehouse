import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { $ } from 'meteor/jquery';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import '/imports/api/topics/tickets/actions.js';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import './topic-box.js';
import './topic-ticket-box.html';

Template.Topic_ticket_header.events(
  actionHandlers(Topics)
);
