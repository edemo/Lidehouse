/* globals document */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import '/imports/api/topics/actions.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/collapse-section.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '/imports/ui_3/views/components/attachments.js';
import '../components/topic-box.js';
import '../components/topic-vote-box.js';
import '../components/comments-section.js';
import '../components/balance-widget.js';
import './board.html';

Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    const communityId = getActiveCommunityId();
    this.subscribe('topics.active', { communityId });
  });
});

Template.Board.helpers({
  activeVotingsTitle() {
    const communityId = getActiveCommunityId();
    const topicsCount = Topics.find({ communityId, category: 'vote', closed: false }).count();
    return `${__('Active votings')} (${topicsCount})`;
  },
  topics(category) {
    const communityId = getActiveCommunityId();
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
});

Template.News.helpers({
  topics(category, stickyVal) {
    const communityId = getActiveCommunityId();
    return Topics.find({ communityId, category, closed: false, sticky: stickyVal }, { sort: { createdAt: -1 } });
  },
  archivedNews() {
    const communityId = getActiveCommunityId();
    return Topics.find({ communityId, category: 'news', closed: true }, { sort: { createdAt: -1 } });
  },
});

Template.News.events({
  'click .js-show-archive'(event, instance) {
    const communityId = getActiveCommunityId();
    instance.subscribe('topics.list', { communityId, category: 'news', closed: true });
  },
});
