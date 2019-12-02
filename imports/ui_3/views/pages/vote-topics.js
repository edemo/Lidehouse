import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/entities.js';
import '/imports/api/topics/actions.js';

import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/voting-edit.js';
import '../common/page-heading.js';
import '../components/topic-vote-box.js';
import '../components/voting-list.html';
import './vote-topics.html';

Template.Vote_topics.viewmodel({
  activesOnly: false,
  searchText: '',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('agendas.inCommunity', { communityId });
      instance.subscribe('topics.list', { communityId, category: 'vote' });
    });
  },
  activeClass() {
    return this.activesOnly() && 'active';
  },
  voteTopics() {
    const communityId = Session.get('activeCommunityId');
    const selector = { communityId, category: 'vote' };
    if (this.activesOnly()) selector.status = 'opened';
    let topicsList = Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
    if (this.searchText()) {
      topicsList = topicsList.filter(t =>
          t.title.toLowerCase().search(this.searchText().toLowerCase()) >= 0
       || t.text.toLowerCase().search(this.searchText().toLowerCase()) >= 0
      );
    }
    return topicsList;
  },
});

Template.Vote_topics.events({
  'click .js-new'(event) {
    Topics.actions.new.run({ entity: Topics.entities.vote });
  },
  'click .js-filter'(event, instance) {
    $(event.target).blur();
    const oldValue = instance.viewmodel.activesOnly();
    instance.viewmodel.activesOnly(!oldValue);
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.searchText(event.target.value);
  },
});
