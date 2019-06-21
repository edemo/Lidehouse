import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Comments } from '/imports/api/comments/comments.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Topics } from '../topics';

// === Vote postProcesses

function closeVoteEvaluate(topicId) {
  const topic = Topics.findOne(topicId);
  if (Meteor.isServer) {
    topic.voteEvaluate(true); // writes results out into voteResults and voteSummary
  }
}

function setClosedBoolean(topicId) {
  Topics.update(topicId, { $set: { closed: true, closesAt: new Date() } });
}

// === Vote statuses

const closed = {
  name: 'closed',
  voteSchema: new SimpleSchema({
  }),
  preProcess() {
    console.log('pre');
  },
  postProcess(topicId) {
    closeVoteEvaluate(topicId);
    setClosedBoolean(topicId);
  },
};

const open = {
  name: 'open',
  voteSchema: new SimpleSchema({
  }),
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
};

export const VoteStatuses = {
  open, closed,
};

Object.keys(VoteStatuses).forEach(statusName => Topics.allowedValues.push(statusName));
Object.keys(VoteStatuses).forEach(statusName => Comments.subjectValues.push(statusName));

// == Vote types:

export const VoteTypes = {
  yesno: {
    start: 'open',
    open: { next: ['closed'] },
    closed: { next: [] },
  },
  choose: {
    start: 'open',
    open: { next: ['closed'] },
    closed: { next: [] },
  },
  preferential: {
    start: 'open',
    open: { next: ['closed'] },
    closed: { next: [] },
  },
  petition: {
    start: 'open',
    open: { next: ['closed'] },
    closed: { next: [] },
  },
  multiChoose: {
    start: 'open',
    open: { next: ['closed'] },
    closed: { next: [] },
  },
};

export function possibleNextStatuses(topic) {
  return VoteTypes[topic.vote.type][topic.status].next;
}

