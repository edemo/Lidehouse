import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { handleError } from '/imports/ui_3/lib/errors';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
// import '/imports/ui_3/stylesheets/animatecss/animate.css';
import '/imports/ui_3/views/modals/confirmation.js';
import '../common/page-heading.js';
import './forum-topics.html';

Template.Forum_topics.viewmodel({
  show: {
    active: true,
    archived: false,
    muted: false,
  },
  searchText: '',
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('topics.list', this.selector());
    });
  },
  forumTopics() {
    let topics = Topics.find(this.selector(), { sort: { updatedAt: -1 } }).fetch();
//  .fetch().sort((t1, t2) => t2.likesCount() - t1.likesCount());
    if (this.searchText()) {
      topics = topics.filter(t =>
          t.title.toLowerCase().search(this.searchText().toLowerCase()) >= 0
      || t.text.toLowerCase().search(this.searchText().toLowerCase()) >= 0
      );
    }
    if (!this.show().muted) return topics.fetch().filter(t => !t.hiddenBy(Meteor.userId()));
    return topics;
  },
  groups() {
    return ['active', 'archived', 'muted'];
  },
  activeClass(group) {
    return this.show()[group] && 'btn-primary active';
  },
  selector() {
    const communityId = ModalStack.getVar('communityId');
    const selector = { communityId, category: 'forum', status: { $ne: 'deleted' } };
    const show = this.show();
    if (show.archived) {
      if (show.active) delete selector.closed;
      else selector.closed = true
    } else {
      if (show.active) selector.closed = false;
      else selector.closed = { $exists: false }
    }
    return selector;
  },
});

Template.Forum_topics.events({
  ...(actionHandlers(Topics)),
  'click .js-like'(event) {
    const id = $(event.target).closest('div.vote-item').data('id');
    Topics.methods.like.call({ id }, handleError);
  },
  'click .js-filter'(event, instance) {
    const group = $(event.target).closest('[data-value]').data('value');
    const show = _.clone(instance.viewmodel.show());
    show[group] = !show[group];
    instance.viewmodel.show(show);
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.searchText(event.target.value);
  },
});
