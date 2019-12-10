import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';

/*export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate(doc) { statusChangeEventSchema(doc.status, doc.topicId); },

  run(event) {
    const topic = checkExists(Topics, event.topicId);
    checkPermissions(this.userId, `${event.type}.${event.status}.insert`, topic.communityId);
    const topicModifier = {};
    if (topic.category === 'ticket') {
      Object.keys(event.ticket).forEach(key => topicModifier[`ticket.${key}`] = event.ticket[key]);
      event.dataUpdate = event.ticket; delete event.ticket;
    }
    topicModifier.status = event.status;
    const result = Topics.update(event.topicId, { $set: topicModifier });

    event.type = event.type;

    //VoteStatuses[event.status].postProcess(event.topicId);

    //Comments.methods.insert._execute({ userId: this.userId }, event);
    Comments.insert(event);
    return result;
  },
});*/

