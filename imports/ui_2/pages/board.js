/* globals document */

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/modal.js';
import '../components/comments-section.js';
import '../components/votebox.js';
import '../components/chatbox.js';
import '../components/empty-chatbox.js';
import './board.html';


Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Board.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});

Template.News.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});

Template.News.events({
  'click .js-view'(event, instance) {
    const modalContext = {
      title: this.title,
      body: 'Proposal_view',
      bodyContext: this,
      btnClose: 'close',
    };
    Modal.show('Modal', modalContext);
  },
});
