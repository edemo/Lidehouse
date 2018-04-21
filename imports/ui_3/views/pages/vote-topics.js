import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { voteColumns } from '/imports/api/topics/votings/tables.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { agendaColumns } from '/imports/api/agendas/tables.js';
import { remove as removeAgenda } from '/imports/api/agendas/methods.js';

import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';
import '/imports/ui_2/modals/voting-edit.js';
import '../common/page-heading.js';
import '../components/votebox.js';
import '../components/voting-list.html';
import './vote-topics.html';

Template.Vote_topics.onCreated(function voteTopicsOnCreated() {
    this.autorun(() => {
        const communityId = Session.get('activeCommunityId');
        this.subscribe('agendas.inCommunity', { communityId });
    });
});

Template.Vote_topics.helpers({
    openVoteTopics() {
        const communityId = Session.get('activeCommunityId');
        return Topics.find({ communityId, category: 'vote', closed: false });
    },
    voteTopics() {
        const communityId = Session.get('activeCommunityId');
        return Topics.find({ communityId, category: 'vote' });
    },
});

Template.Vote_topics.events({
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedTopicId', id);
  },
  'click .js-new'(event) {
    const votingSchema = new SimpleSchema([
      Topics.simpleSchema(),
    ]);
    votingSchema.i18n('schemaVotings');
    Modal.show('Voting_edit', {
      id: 'af.vote.insert',
      collection: Topics,
      schema: votingSchema,
      type: 'method',
      meteormethod: 'topics.insert',
      template: 'bootstrap3-inline',
    });
  },
});
