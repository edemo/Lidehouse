import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import '/imports/api/agendas/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '../components/voting-list.html';
import './agendas.html';

Template.Agendas.onCreated(function boardOnCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('topics.list', { communityId, category: 'vote' });
  });
});

Template.Agendas.helpers({
  agendas() {
    const communityId = ModalStack.getVar('communityId');
    return Agendas.find({ communityId }, { sort: { createdAt: -1 } });
  },
});

Template.Agendas.events({
  ...(actionHandlers(Agendas, 'create')),
  'click .js-participation-sheet'(event, instance) {
    Modal.show('Modal', {
      id: 'participationSheet.view',
      title: 'Participation sheet',
      body: 'Participation_sheet',
      bodyContext: {
        community: getActiveCommunity(),
        agenda: undefined,
      },
      size: 'lg',
    });
  },
});
