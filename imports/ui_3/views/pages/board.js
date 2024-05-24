/* globals document Waypoint */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';

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

Template.Board.viewmodel({
  autorun() {
//    const communityId = this.communityId();
//    if (communityId) {
//      this.templateInstance.subscribe('topics.board', { communityId });  --: Moved to navigation
//    }
  },
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return getActiveCommunity();
  },
  activeVotingsTitle() {
    const communityId = this.communityId();
    const topicsCount = Topics.find({ communityId, category: 'vote', status: { $ne: 'closed' } }).count();
    return `${__('Active votings')} (${topicsCount})`;
  },
  topics(category) {
    const communityId = this.communityId();
    return Topics.find({ communityId, category, status: { $ne: 'closed' } }, { sort: { createdAt: -1 } });
  },
  lgCol(width) {
    let cols = '';
    const community = this.community();
    if (community.isActiveModule('forum') || community.isActiveModule('voting')) {
      cols = `col-lg-${width}`;
    }
    return cols;
  },
});

Template.News.viewmodel({
  showArchived: false,
  autorun() {
    const communityId = this.communityId();
    if (communityId && this.showArchived()) {
      this.templateInstance.subscribe('topics.list', { communityId, category: 'news', status: { $in: ['closed'] } });
    }
  },
  communityId() {
    return getActiveCommunityId();
  },
  topics(category, stickyVal) {
    const communityId = this.communityId();
    return Topics.find({ communityId, category, status: { $ne: 'closed' }, sticky: stickyVal }, { sort: { createdAt: -1 } });
  },
  archivedNews() {
    const communityId = this.communityId();
    return Topics.find({ communityId, category: 'news', status: 'closed' }, { sort: { createdAt: -1 } });
  },
});

Template.News.events({
  'click .js-show-archive'(event, instance) {
    instance.viewmodel.showArchived(true);
  },
});

Template.News_topic.onRendered(function () {
  this.waypoint = new Waypoint({
    element: this.find('.news-elem'),
    handler() {
      const topicId = this.element.dataset.id;
      Meteor.user().hasNowSeen(topicId);
    },
  });
});
