import { Meteor } from 'meteor/meteor';
//import { SimpleSchema } from 'meteor/aldeed:simple-schema';
//import { _ } from 'meteor/underscore';
//import { __ } from '/imports/localization/i18n.js';
//import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment, update as updateComment, remove as removeComment } from '/imports/api/comments/methods.js';
//import { autoformOptions } from '/imports/utils/autoform.js';
import { TicketStatuses } from '/imports/api/topics/tickets/ticket-status.js';

// == Status change events:

const opened = {
  type: 'statusChangeTo',
  name: 'opened',
};

const closed = {
  type: 'statusChangeTo',
  name: 'closed',
};

const deleted = {
  type: 'statusChangeTo',
  name: 'deleted',
};

export const events = {
  opened, closed, deleted,
};

export const allowedEventsForTopics = {
  forum: {},
  ticket: TicketStatuses,
  vote: { opened, closed, deleted },
  news: {},
};

export function returnFormattedEventsForPermissionsBy(topicCategory) {
  const unformattedEvents = allowedEventsForTopics[topicCategory];
  const entriesOfUnformattedEvents = Object.entries(unformattedEvents);
  const formattedEventsForPermissions = [];

  for (const [eventName, eventParameters] of entriesOfUnformattedEvents) {
    const eventType = eventParameters.type;
    if (topicCategory === 'ticket') {
      formattedEventsForPermissions.push(`statusChangeTo.${eventName}`);
    } else {
      formattedEventsForPermissions.push(`event.${eventType}.${eventName}`);
    }
  }

  return formattedEventsForPermissions;
}

/*export function allowedValuesForEventBy(Topic) {
  const entriesOfAllowedEventsForTopics = Object.entries(allowedEventsForTopics);
  for (const [topicName, topicParameters] of entriesOfAllowedEventsForTopics) {
    if (Topic === topicName) return topicParameters;
  }
  return undefined;
}

export const entriesOfEvents = Object.entries(events);

for (const [eventName, eventParameters] of entriesOfEvents) {
  const eventType = eventParameters.type;
  Comments.typeValues.push(`event.${eventType}.${eventName}`);
}

export function returnFormattedEventForPermissionsBy(eventType, eventName) {
  return `event.${eventType}.${eventName}`;
}*/

export function insertEventAsComment(topicId, eventType, eventName) {
  insertComment.call({
    topicId,
    userId: Meteor.userId(),
    type: `event.${eventType}.${eventName}`,
  });
}
