import { Template } from 'meteor/templating';

import { Rooms } from '/imports/api/topics/rooms/rooms.js';
import { insertDelegationForm } from '../pages/delegations';
import './contact-long.html';

Template.Contact_long.events({
  'click .js-message-addressee'(event, instance) {
    Rooms.goToRoom('private chat', instance.data._id);
  },

  'click .js-delegate'(event, instance) {
    insertDelegationForm({ targetPersonId: instance.data._id });
  },
});
