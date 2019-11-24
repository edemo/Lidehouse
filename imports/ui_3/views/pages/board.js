/* globals document */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';

import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import '/imports/api/topics/actions.js';
import '/imports/ui_3/views/components/collapse-section.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '../blocks/action-buttons.js';
import '../components/topic-box.js';
import '../components/topic-vote-box.js';
import '../components/comments-section.js';
import '../components/balance-widget.js';
import './board.html';

Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('topics.board', { communityId });
  });
});

Template.Board.helpers({
  activeVotingsTitle() {
    const communityId = Session.get('activeCommunityId');
    const topicsCount = Topics.find({ communityId, category: 'vote', closed: false }).count();
    return `${__('Active votings')} (${topicsCount})`;
  },
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
});

Template.News.helpers({
  topics(category, stickyVal) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false, sticky: stickyVal }, { sort: { createdAt: -1 } });
  },
});

Template.News.events({
  'click .js-new'(event, instance) {
    Topics.actions.new.run('news');
  },
  'click .js-edit'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Topics.actions.edit.run(id);
  },
  'click .js-delete'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    Topics.actions.delete.run(id);
  },
});
