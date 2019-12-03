import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';
import { insertDelegationForm } from '../pages/delegations';
import './contact-long.html';
import { Delegations } from '../../../api/delegations/delegations';

Template.Contact_long.events({
  'click .js-message-addressee'(event, instance) {
    Rooms.goToRoom('private chat', instance.data._id);
  },
  'click .js-delegate'(event, instance) {
    Delegations.actions.new.run({}, { targetPersonId: instance.data._id });
  },
  'click .js-block'(event, instance) {
    Meteor.users.methods.flag.call({ id: instance.data._id },
      handleError);
  },
});
