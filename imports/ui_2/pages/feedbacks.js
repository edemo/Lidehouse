import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Topics } from '/imports/api/topics/topics.js';
import { feedbackColumns } from '/imports/api/topics/feedbacks/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import './feedbacks.html';
import '../modals/modal.js';

Template.Feedbacks.onCreated(function onCreated() {
  this.subscribe('feedbacks.listing');
});

Template.Feedbacks.helpers({
  feedbacks() {
    return Topics.find({ category: 'feedback' });
  },
  reactiveTableDataFn() {
    function getTableData() {
      return Topics.find({ category: 'feedback' }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: feedbackColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Feedbacks.events({
  'click .js-view'(event) {
    const topicId = $(event.target).data('id');
    const topic = Topics.findOne(topicId);
    const modalContext = {
      title: 'Feedback',
      body: 'Chatbox',
      bodyContext: topic,
    };
    Modal.show('Modal', modalContext);
    Meteor.user().hasNowSeen(topicId);
  },
});
