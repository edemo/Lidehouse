import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Topics } from '/imports/api/topics/topics.js';
import { ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import '/imports/api/topics/entities.js';
import '/imports/api/topics/actions.js';

import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
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
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('agendas.inCommunity', { communityId });
      instance.subscribe('topics.list', { communityId, category: 'vote' });
    });
  },
  activeClass() {
    return this.activesOnly() && 'active';
  },
  voteTopics() {
    const communityId = ModalStack.getVar('communityId');
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
  'click .js-create'(event) {
    const doc = { communityId: getActiveCommunityId() };
    const options = { entity: Topics.entities.vote };
    Object.setPrototypeOf(options, new ActionOptions(Topics));
    Topics.actions.create(options, doc).run();
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
