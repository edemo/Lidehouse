/* global alert, document */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import { __ } from '/imports/localization/i18n.js';

import { onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { delegationColumns } from '/imports/api/delegations/tables.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { remove as removeDelegation, allow as allowDelegations } from '/imports/api/delegations/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';

import './delegations.html';

const colorOwned = '#a3e1d4'; // colors taken from the theme
const colorDelegatedToMe = '#b5b8cf';
const colorOthers = '#dedede';

Template.Delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.Delegations.onRendered(function onRendered() {
  const allowCheckbox = this.find('#allow');
  this.autorun(() => {
    if (Meteor.user()) allowCheckbox.checked = Meteor.user().settings.delegatee;
  });

  // Filling the chart with data
  this.autorun(() => {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    const community = Communities.findOne(communityId);
    if (!user || !community) return;
    const unitsOwned = user.totalOwnedUnits(communityId);
    const unitsDelegatedToMe = user.totalDelegatedToMeUnits(communityId);
    const unitsOthers = community.totalunits - unitsOwned - unitsDelegatedToMe;

    const doughnutData = {
      labels: [__('From ownership'), __('From delegations'), __('Others')],
      datasets: [{
        data: [unitsOwned, unitsDelegatedToMe, unitsOthers],
        backgroundColor: [colorOwned, colorDelegatedToMe, colorOthers],
      }],
    };
    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    const elem = document.getElementById('votingPowerChart').getContext('2d');
    new Chart(elem, { type: 'doughnut', data: doughnutData, options: doughnutOptions });
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

export function insertDelegationForm(doc) {
  const communityId = Session.get('activeCommunityId');
  const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
  Modal.show('Autoform_edit', {
    id: 'af.delegation.insert',
    collection: Delegations,
    omitFields,
    doc,
    type: 'method',
    meteormethod: 'delegations.insert',
    template: 'bootstrap3-inline',
  });
}

Template.Delegations.events({
  'click .js-new'(event, instance) {
    insertDelegationForm();
  },
  'click .js-edit'(event) {
    const id = $(event.target).closest('.js-edit').data('id');
    const delegation = Delegations.findOne(id);
    const communityId = Session.get('activeCommunityId');
    const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
    Modal.show('Autoform_edit', {
      id: 'af.delegation.update',
      collection: Delegations,
      omitFields,
      doc: delegation,
      type: 'method-update',
      meteormethod: 'delegations.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).closest('.js-delete').data('id');
    Modal.confirmAndCall(removeDelegation, { _id: id }, {
      action: 'revoke delegation',
    });
  },
  'click .js-remove'(event) {
    const id = $(event.target).closest('.js-remove').data('id');
    Modal.confirmAndCall(removeDelegation, { _id: id }, {
      action: 'refuse delegation',
    });
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

AutoForm.addModalHooks('af.delegation.insert');
AutoForm.addModalHooks('af.delegation.update');
AutoForm.addHooks('af.delegation.insert', {
  formToDoc(doc) {
    if (!doc.sourcePersonId) doc.sourcePersonId = Meteor.userId();
    return doc;
  },
});
AutoForm.addHooks('af.delegation.insert', {
  onError(formType, error) {
    if (error.error === 'err_otherPartyNotAllowed') {
      displayMessage('warning', 'Other party not allowed this activity');
      return;
    }
    displayError(error);
  },
}, true);
