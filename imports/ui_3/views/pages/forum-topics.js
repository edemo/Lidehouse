import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { handleError } from '/imports/ui_3/lib/errors';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
// import '/imports/ui_3/stylesheets/animatecss/animate.css';
import '/imports/ui_3/views/modals/confirmation.js';
import '../common/page-heading.js';
import './forum-topics.html';

Template.Forum_topics.viewmodel({
  activeGroup: 'Active',
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('topics.list', this.selector());
    });
  },
  forumTopics() {
    const topics = Topics.find(this.selector(), { sort: { updatedAt: -1 } });
//  .fetch().sort((t1, t2) => t2.likesCount() - t1.likesCount());
    if (this.activeGroup() === 'Muted') return topics.fetch().filter(t => t.hiddenBy(Meteor.userId()));
    return topics;
  },
  groups() {
    return ['Active', 'Archived', 'Muted'];
  },
  activeClass(group) {
    return (this.activeGroup() === group) && 'btn-primary active';
  },
  selector() {
    const communityId = Session.get('activeCommunityId');
    const selector = { communityId, category: 'forum' };
    const group = this.activeGroup();
    if (group === 'Active') selector.closed = false;
    else if (group === 'Archived') selector.closed = true;
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
    instance.viewmodel.activeGroup(group);
  },
});
