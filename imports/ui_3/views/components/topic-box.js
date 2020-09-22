import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { AutoForm } from 'meteor/aldeed:autoform';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import '/imports/api/topics/actions.js';
import '/imports/ui_3/views/blocks/hideable.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/comments-section.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';

import './topic-box.html';

Template.Topic_header.events(
  actionHandlers(Topics)
);

Template.Topic_reactions.events({
  'click .js-like'(event) {
    Topics.methods.like.call({ id: this._id }, handleError);
  },
});

Template.Attachments.helpers({
  isImage(value) {
    return (/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(value) || value.includes('image');
  },
  countBy(type, cursor) {
    return cursor.fetch().filter(doc => doc.type.includes(type)).length;
  },
});
