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
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import '/imports/ui_3/views/components/ticket-list.js';
import '/imports/ui_3/views/components/new-ticket.js';
import '/imports/ui_3/views/components/contracts-datatable.js';
import './contracts.html';

Template.Contracts.viewmodel({
  activePartnerRelation: 'supplier',
  show: {
    active: true,
    archived: false,
  },
  onCreated(instance) {
    ModalStack.setVar('relation', this.activePartnerRelation(), true);
    instance.autorun(() => {
      const communityId = getActiveCommunityId();
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('accounts.inCommunity', { communityId });
      instance.subscribe('accountingPeriods.inCommunity', { communityId });
    });
  },
  relationValues() {
    return Relations.mainValues;
  },
  activeClass(partnerRelation) {
    return (this.activePartnerRelation() === partnerRelation) && 'btn-primary active';
  },  
  activeClassStatus(status) {
    return this.show()[status] && 'btn-primary active';
  },
  contracts() {
    const communityId = getActiveCommunityId();
    const community = getActiveCommunity();
    const relation = this.activePartnerRelation();
    const selector = { communityId, relation, title: { $exists: true }, active: true };
    const show = this.show();
    if (show.archived) {
      if (show.active) delete selector.active;
      else selector.active = false;
    } else {
      if (show.active) selector.active = true;
      else selector.active = { $exists: false };
    }
    const contracts = Contracts.find(selector, { sort: { active: -1, 'activeTime.begin': -1 } }).fetch();
    contracts.sort((a, b) => a.title.localeCompare(b.title, community.settings.language, { sensitivity: 'accent' }));
    return contracts;
  },
  statuses() {
    return ['active', 'archived'];
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
  'click .js-status-filter'(event, instance) {
    const status = $(event.target).closest('[data-value]').data('value');
    const show = _.clone(instance.viewmodel.show());
    show[status] = !show[status];
    instance.viewmodel.show(show);
  },
  'click .js-contracts-list'(event, instance) {
    const communityId = ModalStack.getVar('communityId');
    Modal.show('Modal', {
      id: 'contracts.list',
      title: 'contracts',
      body: 'Contracts_datatable',
      bodyContext: { communityId, relations: ['customer', 'supplier'] },
      size: 'lg',
    });
  },
});
