/* global alert, document */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import '/imports/api/delegations/actions.js';
import { delegationColumns } from '/imports/api/delegations/tables.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { remove as removeDelegation, allow as allowDelegations } from '/imports/api/delegations/methods.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/blocks/chart.js';

import './delegations.html';

const colorOwned = '#a3e1d4'; // colors taken from the theme
const colorDelegatedToMe = '#b5b8cf';
const colorOthers = '#dedede';

Template.Delegations.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('parcels.ofSelf', { communityId });
    this.subscribe('delegations.inCommunity', { communityId });
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
    return Meteor.user().settings.delegatee;
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
  delegations() {
    return Delegations.find();
  },
  delegationsFromMe() {
    return Delegations.find({ sourcePersonId: Meteor.userId() });
  },
  delegationsToMe() {
    return Delegations.find({ targetPersonId: Meteor.userId() });
  },
  doughnutData() {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    const community = Communities.findOne(communityId);
    if (!user || !community) return { labels: [], datasets: [] };
    const unitsOwned = user.totalOwnedUnits(communityId);
    const unitsDelegatedToMe = user.totalDelegatedToMeUnits(communityId);
    const unitsOthers = community.totalunits - unitsOwned - unitsDelegatedToMe;
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

Template.Delegations_for_others.events({
  ...(actionHandlers(Delegations)),
});

Template.Delegations.events({
  'click .js-new'(event) {
    Delegations.actions.new.run({}, { sourcePersonId: Meteor.userId() });
  },
  'click #allow'(event) {
    event.preventDefault();
    const value = event.target.checked;
    const message = value ?
      'This will let others to delegate to you' :
      'This will refuse all existing delegations';
    Modal.confirmAndCall(allowDelegations, { value }, {
      action: value ? 'enable delegations' : 'disable delegations',
      message,
    });
  },
});
