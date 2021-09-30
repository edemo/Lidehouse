import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Clock } from '/imports/utils/clock';

import { debugAssert } from '/imports/utils/assert.js';
import { noUpdate } from '/imports/utils/autoform.js';
import { checkExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

// Workflows are tied to topics for now...
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

const schema = new SimpleSchema({
  status: { type: String, autoform: { omit: true } }, /* needs to be checked against the workflow rules */
  closed: { type: Boolean, autoform: { omit: true }, autoValue() {
    if (this.isSet) return this.value;
    const status = this.field('status').value;
    if (!status) return undefined; // don't touch
    if (status === 'closed' || status === 'deleted') return true;
    else return false;
  } },
  opensAt: { type: Date, optional: true, autoform: _.extend({ omit: true }, noUpdate),
    custom() {
      const now = Clock.currentTime();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      if (startOfToday > this.value) return 'notAllowed';
      return undefined;
    },
  },
  closesAt: { type: Date, optional: true, autoform: _.extend({ omit: true }, noUpdate),
    custom() {
      const closingDate = this.value;
      const openingDate = this.field('opensAt').value || Clock.currentTime();
      const dayLater = moment(openingDate).add(1, 'day').toDate();
      if (moment(Clock.currentTime()).add(1, 'day').toDate() > this.value) return 'notAllowed';
      if (closingDate <= dayLater) return 'notAllowed';
      return undefined;
    },
  },
});

const modifiableFields = ['closed'];

const helpers = {
  statusObject(statusName) {
    return this.workflow()[statusName || this.status].obj;
  },
  possibleStartStatuses() {
    const statuses = this.workflow().start;
    return statuses;
  },
  startStatus() {
    const startStatuses = this.possibleStartStatuses();
    debugAssert(startStatuses.length >= 1);
    return startStatuses[0];
  },
  possibleNextStatuses() {
    const statuses = this.workflow()[this.status].next;
    return statuses;
  },
};

const opened = {
  name: 'opened',
};

const closed = {
  name: 'closed',
};

const deleted = {
  name: 'deleted',
};

const defaultStatuses = {
  opened, closed, deleted,
};

export const defaultWorkflow = {
  statusValues: ['opened', 'closed', 'deleted'],
  start: [opened],
  opened: { obj: opened, next: [closed, deleted] },
  closed: { obj: closed, next: [deleted] },
  deleted: { obj: deleted, next: [] },
};

function checkStatusStartAllowed(topic, status) {
  if (!_.contains(topic.possibleStartStatuses().map(s => s.name), status)) {
    throw new Meteor.Error('err_permissionDenied', 'Topic cannot start in this status', { topic: topic.toString(), status });
  }
}

function checkStatusChangeAllowed(topic, statusTo) {
  if (!_.contains(topic.possibleNextStatuses().map(s => s.name), statusTo)) {
    throw new Meteor.Error('err_permissionDenied', 'Topic cannot move from this status into that status', { topic: topic.toString(), statusFrom: topic.status, statusTo });
  }
}

const statusChange = new ValidatedMethod({
  name: 'statusChange',
  validate: doc => Comments.simpleSchema({ category: 'statusChange' }).validator({ clean: true })(doc),
  run(event) {
    _.extend(event, { category: 'statusChange' });
    const topic = checkExists(Topics, event.topicId);
    const category = topic.category;
    const workflow = topic.workflow();
    // checkPermissions(this.userId, `${category}.${event.type}.${topic.status}.leave`, topic);
    checkPermissions(this.userId, `${category}.statusChange.${event.status}.enter`, topic, topic);
    checkStatusChangeAllowed(topic, event.status);

    const onLeave = workflow[topic.status].obj.onLeave;
    if (onLeave) onLeave(event, topic);

    const topicModifier = { category: topic.category };
    topicModifier.status = event.status;
    const statusObject = Topics.categories[category].statuses ? Topics.categories[category].statuses[event.status] : defaultStatuses[event.status];
    if (statusObject.data) {
      statusObject.data.forEach(key => topicModifier[`${category}.${key}`] = event.dataUpdate[key]);
    }
    const updateResult = Topics.update(event.topicId, { $set: topicModifier });

    const insertResult = Comments.insert(event);

    const newComment = Comments.findOne(insertResult);
    const newTopic = Topics.findOne(event.topicId);
    const onEnter = workflow[event.status].obj.onEnter;
    if (onEnter) onEnter(event, newTopic);

    updateMyLastSeen._execute({ userId: this.userId },
      { topicId: topic._id, lastSeenInfo: { timestamp: newComment.createdAt } },
    );

    return insertResult;
  },
});

const statusUpdate = new ValidatedMethod({
  name: 'statusUpdate',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),
  run({ _id, modifier }) {
    const topic = checkExists(Topics, _id);
    const category = topic.category;
    const modifiableFields = [];
    if (topic.modifiableFieldsByStatus()) {
      topic.modifiableFieldsByStatus().forEach(key => modifiableFields.push(`${category}.${key}`));
    }
    checkPermissions(this.userId, `${category}.statusChange.${topic.status}.enter`, topic);
    checkModifier(topic, modifier, modifiableFields);
    Topics.update(_id, modifier, { selector: { category } });
  },
});

const hooks = {
  before: {
    insert(userId, doc) {
      checkStatusStartAllowed(Topics._transform(doc), doc.status);
    },
  },
};

export function Workflow(workflow = defaultWorkflow) {
  _.extend(helpers, {
    workflow() {
      return workflow;
    },
  });

  return { name: 'Workflow',
    schema, modifiableFields, helpers, methods: { statusChange, statusUpdate }, hooks,
  };
}
