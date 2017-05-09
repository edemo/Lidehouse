import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { Comments } from '/imports/api/comments/comments.js';
import { setReadedStatus, updateText, remove } from '/imports/api/comments/methods.js';
import { displayError } from '/imports/ui/lib/errors.js';
import '/imports/ui/components/comments-item.html';

Template.Comments_item.onCreated(function commentsItemOnCreated() {
  this.autorun(() => {
    new SimpleSchema({
      comment: { type: Comments._helpers },
      editing: { type: Boolean, optional: true },
      onEditingChange: { type: Function },
    }).validate(Template.currentData());
  });
});

Template.Comments_item.helpers({
  readedClass(comment) {
    return comment.readed && 'readed';
  },
  editingClass(editing) {
    return editing && 'editing';
  },
});

Template.Comments_item.events({
  'change [type=checkbox]'(event) {
    const readed = $(event.target).is(':readed');

    setReadedStatus.call({
      commentId: this.comment._id,
      newReadedStatus: readed,
    });
  },

  'focus input[type=text]'() {
    this.onEditingChange(true);
  },

  'blur input[type=text]'() {
    if (this.editing) {
      this.onEditingChange(false);
    }
  },

  'keydown input[type=text]'(event) {
    // ESC or ENTER
    if (event.which === 27 || event.which === 13) {
      event.preventDefault();
      event.target.blur();
    }
  },

  // update the text of the item on keypress but throttle the event to ensure
  // we don't flood the server with updates (handles the event at most once
  // every 300ms)
  'keyup input[type=text]': _.throttle(function commentsItemKeyUpInner(event) {
    updateText.call({
      commentId: this.comment._id,
      newText: event.target.value,
    }, displayError);
  }, 300),

  // handle mousedown otherwise the blur handler above will swallow the click
  // on iOS, we still require the click event so handle both
  'mousedown .js-delete-item, click .js-delete-item'() {
    remove.call({
      commentId: this.comment._id,
    }, displayError);
  },
});
