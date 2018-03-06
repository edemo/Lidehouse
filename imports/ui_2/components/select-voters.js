import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Session } from 'meteor/session';
import { ReactiveDict } from 'meteor/reactive-dict';
import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';
import { onSuccess, displayMessage } from '/imports/ui/lib/errors.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/modal.js';
import '../components/select-voters.html';

Template.Select_voters.onCreated(function selectVotersOnCreated() {
});

Template.Select_voters.onRendered(function selectVotersOnRendered() {
});

Template.Select_voters.helpers({
  schema() {
    const schema = new SimpleSchema({
      voters: { type: Array },
      'voters.$': { type: String /* userId or IdCard identifier */,
        autoform: {
          options() {
            const communityId = Session.get('activeCommunityId');
            const ownerships = Memberships.find({ communityId, role: 'owner' });
            const options = ownerships.map(function (o) {
              return { label: o.displayName(), value: o.identifier() };
            });
            const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
            return sortedOptions;
          },
        },
      },
    });
    return schema;
  },
});

Template.Select_voters.events({
});
