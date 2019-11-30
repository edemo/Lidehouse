import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Topics } from './topics.js';
import { Votings } from './votings/votings.js';
import { Tickets } from './tickets/tickets.js';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

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
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo', 'sticky'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'news',
    },
  },
  forum: {
    form: 'Autoform_edit',
    inputFields: ['title', 'text', 'photo'],
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'forum',
    },
  },
  vote: {
    form: 'Voting_edit',
    schema: Votings.schema,
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'vote',
    },
  },
  // tickets
  issue: {
    form: 'Autoform_edit',
    schema: Tickets.schema,
    inputFields: IssueProto.inputFields(),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      ticket: () => ({
        type: 'issue',
        contractId: Session.get('activeAutoform').contractId,
      }),
    },
  },
  maintenance: {
    form: 'Autoform_edit',
    schema: ticketSchemaWithMoreDates,
    inputFields: MaintenanceProto.inputFields(),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      ticket: () => ({
        type: 'maintenance',
        contractId: Session.get('activeAutoform').contractId,
      }),
    },
  },
  upgrade: {
    form: 'Autoform_edit',
    schema: Tickets.schema,
    inputFields: UpgradeProto.inputFields(),
    implicitFields: {
      communityId: () => Session.get('activeCommunityId'),
      category: 'ticket',
      ticket: () => ({
        type: 'upgrade',
        contractId: Session.get('activeAutoform').contractId,
      }),
    },
  },
};
