import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Topics } from './topics.js';
import { Votings } from './votings/votings.js';
import { Tickets } from './tickets/tickets.js';

export const ticketSchemaWithMoreDates = new SimpleSchema([
  Topics.simpleSchema({ category: 'ticket' }), {
    moreDates: { type: [Date], optional: true },
  },
]);
ticketSchemaWithMoreDates.i18n('schemaTickets');

// Ptototypes used for their virtual functions
const IssueProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'issue' } });
const MaintenanceProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'maintenance' } });
const UpgradeProto = Topics._transform({ category: 'ticket', text: '-', ticket: { type: 'upgrade' } });

Topics.entities = {
  news: {
    name: 'news',
    schema: Topics.simpleSchema({ category: 'news' }),
  },
  forum: {
    name: 'forum',
    schema: Topics.simpleSchema({ category: 'forum' }),
  },
  vote: {
    name: 'vote',
    schema: Topics.simpleSchema({ category: 'vote' }),
    form: 'Voting_edit',
  },
  // tickets
  issue: {
    name: 'issue',
    schema: Topics.simpleSchema({ category: 'ticket' }),
    inputFields: IssueProto.inputFields(),
    implicitFields: {
      communityId: () => ModalStack.getVar('communityId'),
      category: 'ticket',
      'ticket.type': 'issue',
        // TODO: if modalContext has contract, here we could launch this issue in scheduled state
    },
  },
  maintenance: {
    name: 'maintenance',
    schema: ticketSchemaWithMoreDates,
    formType: 'normal',
    inputFields: MaintenanceProto.inputFields().concat(['moreDates', 'localizer']),
    implicitFields: {
      communityId: () => ModalStack.getVar('communityId'),
      category: 'ticket',
      'ticket.type': 'maintenance',
    },
  },
  upgrade: {
    name: 'upgrade',
    schema: Topics.simpleSchema({ category: 'ticket' }),
    inputFields: UpgradeProto.inputFields(),
    implicitFields: {
      communityId: () => ModalStack.getVar('communityId'),
      category: 'ticket',
      'ticket.type': 'upgrade',
        // TODO: if modalContext has contract, here we could launch this issue in scheduled state
    },
  },
  room: {
    name: 'room',
    schema: Topics.simpleSchema({ category: 'room' }),
  },
};
