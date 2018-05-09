import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Delegations } from '/imports/api/delegations/delegations.js';
import './contact-long.html';

Template.Contact_long.events({
  'click .js-message-addressee'(event, instance) {
    Session.set('messengerPersonId', instance.data._id);
  },

  'click .js-delegate'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
    Modal.show('Autoform_edit', {
      id: 'af.delegation.insert',
      collection: Delegations,
      omitFields,
      doc: { targetPersonId: instance.data._id },
      type: 'method',
      meteormethod: 'delegations.insert',
      template: 'bootstrap3-inline',
    });
  },
});
