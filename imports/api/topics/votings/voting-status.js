import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Comments } from '/imports/api/comments/comments.js';
import { autoformOptions } from '/imports/utils/autoform.js';

// == Vote statuses:

const opened = {
  name: 'opened',
};

const closed = {
  name: 'closed',
};

const deleted = {
  name: 'deleted',
};

export const VoteStatuses = {
  opened, closed, deleted,
};

Object.keys(VoteStatuses).forEach(statusName => Comments.typeValues.push(`voteStatusChangeTo.${statusName}`));

