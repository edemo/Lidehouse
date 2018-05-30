import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Delegations } from '/imports/api/delegations/delegations.js';
import { insertDelegationForm } from '../pages/delegations';
import './contact-long.html';

Template.Contact_long.events({
  'click .js-message-addressee'(event, instance) {
    Session.set('messengerPersonId', instance.data._id);
  },

  'click .js-delegate'(event, instance) {
    insertDelegationForm({ targetPersonId: instance.data._id });
  },
});
