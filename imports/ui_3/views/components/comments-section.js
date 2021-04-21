/* globals document Waypoint */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { __ } from '/imports/localization/i18n.js';
import { displayError, handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Push } from 'meteor/raix:push';
import '/imports/api/comments/methods.js';
import '/imports/api/comments/actions.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/attachments.js';
import './comments-section.html';

Template.Comments_section.onRendered(function chatboxOnRendered() {
  this.waypoint = new Waypoint({
    element: this.find('.comment-section'),
    handler() {
      const topicId = this.element.dataset.id;
    // displayMessage('info', `You just seen ${topicId}`); // debug
      Meteor.user().hasNowSeen(topicId);
    },
   // context: document.getElementById('wrapper'), // needed if wrapper height is 100vh for webview
    offset: '80%',
  });
  // Above is nicer syntax , but requires bigu:jquery-waypoints https://stackoverflow.com/questions/28975693/using-jquery-waypoints-in-meteor
  /* this.waypoint = this.$('.comment-section').waypoint(function (direction) {
    displayMessage('info', `You just seen ${this.dataset.id}`); // debug
  }, {
    offset: '80%',
  });*/
});

Template.Comments_section.onDestroyed(function chatboxOnDestroyed() {
  this.waypoint.destroy();
});

const RECENT_COMMENT_COUNT = 5;

Template.Comments_section.viewmodel({
  commentText: '',
  draft: '',
  showAll: false, // by default show only unread
  lastSeenTimestamp: null,
  onCreated(instance) {
    const user = Meteor.user();
    const topic = this.topic();
    // Not calling this in autorun, because we dont want the new comments to disappear as soon as the user looks at them
    if (!topic.unseenCommentCountBy(user._id, Meteor.users.SEEN_BY.EYES)) this.showAll(true);
    else this.lastSeenTimestamp(user?.lastSeens()[Meteor.users.SEEN_BY.EYES][topic._id]?.timestamp);
  },
  topic() {
    const topic = this.templateInstance.data;
    return topic;
  },
  isVote() {
    return this.topic().category === 'vote';
  },
  eventsOfTopic() {
    const route = FlowRouter.current().route.name;
    let events;
    if (route === 'Board') { // on the board, showing only the most recent ones
      events = Comments.find({ topicId: this._id.value }, { sort: { createdAt: 1 } })
        .fetch().slice(-1 * RECENT_COMMENT_COUNT);
    } else {  // on the topic page, showing the unread ones, or all
      events = this.showAll()
        ? Comments.find({ topicId: this._id.value }, { sort: { createdAt: 1 } })
        : this.topic().commentsSince(this.lastSeenTimestamp());
      events = events.fetch();
    }
    return events;
  },
  undisplayedEvents() {
    return this.topic().commentCounter - this.eventsOfTopic().length;
  },
});

Template.Comments_section.events({
  'click .js-show-all'(event, instance) {
    instance.viewmodel.showAll(true);
  },
  'click .social-comment .js-attach'(event, instance) {
    const vm = instance.viewmodel;
    const doc = {
      topicId: this._id,
      text: instance.viewmodel.commentText(),
      category: 'comment',
    };
    const options = {};
    Object.setPrototypeOf(options, new ActionOptions(Comments));
    Comments.actions.create(options, doc).run(event, instance);
    vm.commentText('');
  },
  'click .social-comment .js-send'(event, instance) {
    const vm = instance.viewmodel;
    vm.draft(vm.commentText());
    vm.commentText('');
    Comments.methods.insert.call({
      topicId: this._id,
      text: vm.draft(),
    }, (err) => {
      if (err) {
        vm.commentText(vm.draft());
        displayError(err);
      }
    });
    const topic = Topics.findOne(this._id);
    Push.send({
      from: 'Honline',
      title: topic.title,
      text: vm.draft(),
      query: {
        userId: topic.creatorId,
      },
    });
  },
});

//------------------------------------

Template.Comment.viewmodel({
  editing: false,
});

Template.Comment.events({
  'click .js-like'(event, instance) {
    Comments.actions.like({}, this).run();
  },
  'click .js-inplaceEdit'(event, instance) {
    const element = $(event.target).closest('.media-body');
    Meteor.setTimeout(() => element.find('textarea')[0].focus(), 100);
    instance.viewmodel.editing(true);
  },
  'click .js-edit'(event, instance) {
    const doc = instance.data;
    const options = {};
    Object.setPrototypeOf(options, new ActionOptions(Comments));
    Comments.actions.edit(options, doc).run(event, instance);
    instance.viewmodel.editing(false);
  },
  'click .js-save'(event, instance) {
    const text = $(event.target).closest('.media-body').find('textarea')[0].value;
    Comments.methods.update.call({
      _id: instance.data._id,
      modifier: { $set: { text } },
    }, handleError);
    instance.viewmodel.editing(false);
  },
  'click .js-cancel'(event, instance) {
    instance.viewmodel.editing(false);
  },
  'keydown textarea'(event, instance) {
    if (event.keyCode === 27) {
      instance.viewmodel.editing(false);
    }
  },
});
