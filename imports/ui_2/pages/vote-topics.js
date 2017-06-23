import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import { Session } from 'meteor/session';

import './vote-topics.html';
import '../components/vote-create.js';
import '../components/votebox.js';

Template.Vote_topics.onCreated(function voteTopicsOnCreated() {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Vote_topics.helpers({
  topics(category) {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category });
  },
});
