
import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
import { Communities } from '/imports/api/communities/communities';
import { Topics } from '/imports/api/topics/topics.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Notifications_Email } from './notifications-email.js';
import { Vote_closes_Email } from './vote-closes-email.js';

export function sendSingleTopicNotification(user, community, topicToDisplay) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  EmailSender.send({
    to: user.getPrimaryEmail(),
    subject: EmailTemplateHelpers.subject('Notifications', user, community),
    template: 'Notifications_Email',
    data: {
      user,
      community,
      topicsToDisplay: [topicToDisplay],
      ...Notifications_Email.layoutData,
    },
  });
  const lastSeenInfo = { timestamp: new Date() };
  updateMyLastSeen._execute({ userId: user._id }, { topicId: topicToDisplay.topic._id, lastSeenInfo, seenType: Meteor.users.SEEN_BY.NOTI });
}

function sendNotifications(user) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  user.communities().forEach((community) => {
    const topicsWithEvents = Topics.topicsWithUnseenEvents(user._id, community._id, Meteor.users.SEEN_BY.NOTI);
    const topicsToDisplay = topicsWithEvents.filter(t => t.hasThingsToDisplay());
    if (topicsToDisplay.length > 0) {
      EmailSender.send({
        to: user.getPrimaryEmail(),
        subject: EmailTemplateHelpers.subject('Notifications', user, community),
        template: 'Notifications_Email',
        data: {
          user,
          community,
          topicsToDisplay,
          ...Notifications_Email.layoutData,
        },
      });
    }
    topicsWithEvents.forEach((te) => {
      const lastSeenInfo = { timestamp: new Date() };
      updateMyLastSeen._execute({ userId: user._id }, { topicId: te.topic._id, lastSeenInfo, seenType: Meteor.users.SEEN_BY.NOTI });
    });
  });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // Log.debug(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}

//--------------------------------------------------------------

export const EXPIRY_NOTI_DAYS = 3;

export function notifyExpiringVotings() {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  Communities.find().forEach((community) => {
    const expiringVotings = Topics.find({
      communityId: community._id,
      category: 'vote',
      status: 'opened',
      closesAt: {
        $gt: moment().add(EXPIRY_NOTI_DAYS, 'day').subtract(12, 'hour').toDate(),
        $lte: moment().add(EXPIRY_NOTI_DAYS, 'day').add(12, 'hour').toDate(),
      },
    }).fetch();
    if (expiringVotings.length === 0) return;
    community.voters().forEach((voter) => {
      const user = voter.user();
      if (user.settings.notiFrequency === 'never') return;
      const notVotedYetVotings = expiringVotings.filter((voting) => {
        return !voting.voteCastsIndirect[voter._id];
      });
      if (notVotedYetVotings.length > 0) {
        EmailSender.send({
          to: user.getPrimaryEmail(),
          subject: EmailTemplateHelpers.subject('Notifications', user, community),
          template: 'Vote_closes_Email',
          data: {
            user,
            community,
            topics: notVotedYetVotings,
            ...Vote_closes_Email.layoutData,
          },
        });
      }
    });
  });
}
