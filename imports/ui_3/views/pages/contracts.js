import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Relations } from '/imports/api/core/relations.js';
import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/contracts/actions.js';
import { actionHandlers, ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import '/imports/ui_3/views/components/ticket-list.js';
import '/imports/ui_3/views/components/new-ticket.js';
import '/imports/ui_3/views/components/contracts-datatable.js';
import './contracts.html';

Template.Contracts.viewmodel({
  activePartnerRelation: 'supplier',
  onCreated(instance) {
    ModalStack.setVar('relation', this.activePartnerRelation(), true);
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
      instance.subscribe('accounts.inCommunity', { communityId });
    });
  },
  relationValues() {
    return Relations.mainValues;
  },
  activeClass(partnerRelation) {
    return (this.activePartnerRelation() === partnerRelation) && 'btn-primary active';
  },
  contracts() {
    const communityId = ModalStack.getVar('communityId');
    const relation = ModalStack.getVar('relation');
    return Contracts.find({ communityId, relation, title: { $exists: true } });
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
});

Template.Contracts.events({
  ...(actionHandlers(Partners,'create')),
  ...(actionHandlers(Contracts, 'create')),
  'click .topics .js-create, .topics .js-import'(event) {
    const entityName = $(event.target).closest('[data-entity]').data('entity');
    const entity = Topics.entities[entityName];
    const contractId = $(event.target).closest('[data-id]').data('id');
    const partnerId = Contracts.findOne(contractId).partnerId;
    const options = { entity };
    const doc = { communityId: getActiveCommunityId() };
    doc.ticket = { contractId, partnerId };
    Object.setPrototypeOf(options, new ActionOptions(Topics));
    Topics.actions.create(options, doc).run();
  },
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
    ModalStack.setVar('relation', partnerRelation, true);
  },
  'click .js-contracts-list'(event, instance) {
    const communityId = ModalStack.getVar('communityId');
    Modal.show('Modal', {
      title: 'contracts',
      body: 'Contracts_datatable',
      bodyContext: { communityId, relations: ['customer', 'supplier'] },
      size: 'lg',
    });
  },
});
