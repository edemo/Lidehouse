import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Topics } from './topics.js';
import { Votings } from './votings/votings.js';
import { Tickets } from './tickets/tickets.js';

export const ticketSchemaWithMoreDates = new SimpleSchema([
  Tickets.schema, {
    moreDates: { type: [Date], optional: true },
  },
]);
Meteor.startup(function attach() {
  ticketSchemaWithMoreDates.i18n('schemaTickets');
});

// Ptototypes used for their virtual functions
const IssueProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'issue' } });
const MaintenanceProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'maintenance' } });
const UpgradeProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'upgrade' } });

Topics.entities = {
  news: {
    name: 'news',
    inputFields: ['title', 'text', 'photo', 'sticky'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'news',
    },
  },
  forum: {
    name: 'forum',
    inputFields: ['title', 'text', 'photo'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'forum',
    },
  },
  vote: {
    name: 'vote',
    form: 'Voting_edit',
    schema: Votings.schema,
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'vote',
    },
  },
  // tickets
  issue: {
    name: 'issue',
    schema: Tickets.schema,
    inputFields: IssueProto.inputFields(),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      'ticket.type': 'issue',
        // TODO: if modalContext has contract, here we could launch this issue in scheduled state
    },
  },
  maintenance: {
    name: 'maintenance',
    schema: ticketSchemaWithMoreDates,
    formType: 'normal',
    inputFields: MaintenanceProto.inputFields().concat(['moreDates']),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      'ticket.type': 'maintenance',
      'ticket.contractId': () => Session.get('modalContext').contractId,
      'ticket.partnerId': () => Session.get('modalContext').partnerId,
      'ticket.expectedStart': () => Session.get('modalContext').expectedStart,
    },
  },
  upgrade: {
    name: 'upgrade',
    schema: Tickets.schema,
    inputFields: UpgradeProto.inputFields(),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      'ticket.type': 'upgrade',
        // TODO: if modalContext has contract, here we could launch this issue in scheduled state
    },
  },
};
