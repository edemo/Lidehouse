/* global confirm */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';

import './topics-show.html';

// Component used in the template
import './comments-item.js';

import {
  updateName,
  makePublic,
  makePrivate,
  remove,
} from '../../api/topics/methods.js';

import {
  insert,
} from '../../api/comments/methods.js';

import { displayError } from '../lib/errors.js';

Template.Topics_show.onCreated(function topicShowOnCreated() {
  this.autorun(() => {
    new SimpleSchema({
      topic: { type: Function },
      commentsReady: { type: Boolean },
      comments: { type: Mongo.Cursor },
    }).validate(Template.currentData());
  });

  this.state = new ReactiveDict();
  this.state.setDefault({
    editing: false,
    editingComment: false,
  });

  this.saveTopic = () => {
    this.state.set('editing', false);

    const newName = this.$('[name=name]').val().trim();
    if (newName) {
      updateName.call({
        topicId: this.data.topic()._id,
        newName,
      }, displayError);
    }
  };

  this.editTopic = () => {
    this.state.set('editing', true);

    // force the template to redraw based on the reactive change
    Tracker.flush();
    // We need to wait for the fade in animation to complete to reliably focus the input
    Meteor.setTimeout(() => {
      this.$('.js-edit-form input[type=text]').focus();
    }, 400);
  };

  this.deleteTopic = () => {
    const topic = this.data.topic();
    const message = `${TAPi18n.__('topics.remove.confirm')} "${topic.name}"?`;

    if (confirm(message)) { // eslint-disable-line no-alert
      remove.call({
        topicId: topic._id,
      }, displayError);

      FlowRouter.go('App.home');
      return true;
    }

    return false;
  };

  this.toggleTopicPrivacy = () => {
    const topic = this.data.topic();
    if (topic.userId) {
      makePublic.call({ topicId: topic._id }, displayError);
    } else {
      makePrivate.call({ topicId: topic._id }, displayError);
    }
  };
});

Template.Topics_show.helpers({
  commentArgs(comment) {
    const instance = Template.instance();
    return {
      comment,
      editing: instance.state.equals('editingComment', comment._id),
      onEditingChange(editing) {
        instance.state.set('editingComment', editing ? comment._id : false);
      },
    };
  },
  editing() {
    const instance = Template.instance();
    return instance.state.get('editing');
  },
});

Template.Topics_show.events({
  'click .js-cancel'(event, instance) {
    instance.state.set('editing', false);
  },

  'keydown input[type=text]'(event) {
    // ESC
    if (event.which === 27) {
      event.preventDefault();
      $(event.target).blur();
    }
  },

  'blur input[type=text]'(event, instance) {
    // if we are still editing (we haven't just clicked the cancel button)
    if (instance.state.get('editing')) {
      instance.saveTopic();
    }
  },

  'submit .js-edit-form'(event, instance) {
    event.preventDefault();
    instance.saveTopic();
  },

  // handle mousedown otherwise the blur handler above will swallow the click
  // on iOS, we still require the click event so handle both
  'mousedown .js-cancel, click .js-cancel'(event, instance) {
    event.preventDefault();
    instance.state.set('editing', false);
  },

  // This is for the mobile dropdown
  'change .topic-edit'(event, instance) {
    const target = event.target;
    if ($(target).val() === 'edit') {
      instance.editTopic();
    } else if ($(target).val() === 'delete') {
      instance.deleteTopic();
    } else {
      instance.toggleTopicPrivacy();
    }

    target.selectedIndex = 0;
  },

  'click .js-edit-topic'(event, instance) {
    instance.editTopic();
  },

  'click .js-toggle-topic-privacy'(event, instance) {
    instance.toggleTopicPrivacy();
  },

  'click .js-delete-topic'(event, instance) {
    instance.deleteTopic();
  },

  'click .js-comment-add'(event, instance) {
    instance.$('.js-comment-new input').focus();
  },

  'submit .js-comment-new'(event) {
    event.preventDefault();

    const $input = $(event.target).find('[type=text]');
    if (!$input.val()) {
      return;
    }

    insert.call({
      topicId: this.topic()._id,
      text: $input.val(),
    }, displayError);

    $input.val('');
  },
});
