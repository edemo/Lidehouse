import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Topics } from '/imports/api/topics/topics.js';
import { voteColumns } from '/imports/api/topics/votings/tables.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { agendaColumns } from '/imports/api/agendas/tables.js';
import { remove as removeAgenda } from '/imports/api/agendas/methods.js';

import './vote-topics.html';
import '../components/vote-create.js';
import '../components/votebox.js';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';

Template.Vote_topics.onCreated(function voteTopicsOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('agendas.inCommunity', { communityId });
  });
});

Template.Vote_topics.helpers({
  isMobile: true,
  isMobileDevice() {
      var screensize=$(window).width();
      if (screensize<=768){
        return true;
      }
      else {
        return false;
      }
  },
  openVoteTopics() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'vote', closed: false });
  },
  closedVotingsTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'vote', closed: true }).fetch();
    }
    return getTableData;
  },
  closedVotingsOptionsFn() {
    function getOptions() {
      return {
        columns: voteColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
  hasSelection() {
    return !!Session.get('selectedTopicId');
  },
  selectedDoc() {
    return Topics.findOne(Session.get('selectedTopicId'));
  },
  agendasTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Agendas.find({ communityId }).fetch();
    }
    return getTableData;
  },
  agendasOptionsFn() {
    function getOptions() {
      return {
        columns: agendaColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Vote_topics.events({
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedTopicId', id);
  },
  'click .js-new-vote, click .js-vote-nope'(event) {
    $('.js-new-vote')[0].classList.toggle('hidden');
  },
  'click #tab-content3 .js-new'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.agenda.insert',
      collection: Agendas,
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'agendas.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #tab-content3 .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.agenda.update',
      collection: Agendas,
      omitFields: ['communityId'],
      doc: Agendas.findOne(id),
      type: 'method-update',
      meteormethod: 'agendas.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #tab-content3 .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeAgenda, { _id: id }, {
      action: 'delete agenda',
      message: 'This will not delete topics',
    });
  },
});

AutoForm.addModalHooks('af.agenda.insert');
AutoForm.addModalHooks('af.agenda.update');
AutoForm.addHooks('af.agenda.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
