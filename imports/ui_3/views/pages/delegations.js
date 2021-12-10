/* global alert, document */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { getActivePartnerId } from '/imports/ui_3/lib/active-partner.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import '/imports/api/delegations/actions.js';
import { delegationColumns } from '/imports/api/delegations/tables.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { remove as removeDelegation, allow as allowDelegations } from '/imports/api/delegations/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/blocks/chart.js';

import './delegations.html';

const colorOwned = '#a3e1d4'; // colors taken from the theme
const colorDelegatedToMe = '#b5b8cf';
const colorOthers = '#dedede';

Template.Delegations.onCreated(function onCreated() {
  ModalStack.setVar('relation', 'member', true);
  this.autorun(() => {
    const communityId = getActiveCommunityId();
    this.subscribe('delegations.inCommunity', { communityId });
    this.subscribe('parcels.inCommunity', { communityId });
  });
});

Template.Delegation_list.helpers({
  displayScope(scope) {
    return Render.translateWithScope('schemaDelegations.scope')(scope);
  },
  displayScopeObject(scopeObject) {
    return Delegations.renderScopeObject(scopeObject);
  },
});

Template.Delegations_for_others.helpers({
  checked() {
    return Meteor.user() && Meteor.user().settings.delegatee;
  },
  delegations() {
    return Delegations.find();
  },
  delegationsDataFn() {
    return () => {
      return Delegations.find().fetch();
    };
  },
  delegationsOptionsFn() {
    return () => {
      return {
        columns: delegationColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

Template.Delegations.helpers({
  checked() {
    return Meteor.user() && Meteor.user().settings.delegatee;
  },
  delegations() {
    return Delegations.find();
  },
  delegationsFromMe() {
    return Delegations.find({ sourceId: getActivePartnerId() });
  },
  delegationsToMe() {
    return Delegations.find({ targetId: getActivePartnerId() });
  },
  doughnutData() {
    const user = Meteor.user();
    const communityId = getActiveCommunityId();
    const community = Communities.findOne(communityId);
    if (!user || !community) return { labels: [], datasets: [] };
    const unitsOwned = user.totalOwnedUnits(communityId);
    const unitsDelegatedToMe = user.totalDelegatedToMeUnits(communityId);
    const unitsOthers = community.totalUnits() - unitsOwned - unitsDelegatedToMe;
    return {
      labels: [__('From ownership'), __('From delegations'), __('Others')],
      datasets: [{
        data: [unitsOwned, unitsDelegatedToMe, unitsOthers],
        backgroundColor: [colorOwned, colorDelegatedToMe, colorOthers],
      }],
    };
  },
  doughnutOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
    };
  },
});

Template.Delegations.events({
  'click .js-create'(event) {
    Delegations.actions.create({}, { sourceId: getActivePartnerId(), communityId: getActiveCommunityId() }).run();
  },
  'click #allow'(event) {
    event.preventDefault();
    const value = event.target.checked;
    const message = value ?
      'This will let others to delegate to you' :
      'This will refuse all existing delegations';
    Modal.confirmAndCall(allowDelegations, { value }, {
      action: value ? 'enable' : 'disable',
      entity: 'delegation',
      message,
    });
  },
});
