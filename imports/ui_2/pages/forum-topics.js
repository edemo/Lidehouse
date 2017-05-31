import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import { Session } from 'meteor/session';

import './forum-topics.html';
import '../components/chatbox.js';

Template.Forum_topics.onCreated(function forumTopicsOnCreated() {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Forum_topics.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category });
  },
});
