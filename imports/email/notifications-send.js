
import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities';
import { Topics } from '/imports/api/topics/topics.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import { EmailSender } from '/imports/startup/server/email-sender.js';
import { EmailTemplateHelpers } from './email-template-helpers';

function sendNotifications(user) {
  debugAssert(Meteor.isServer);
  user.communities().forEach((community) => {
    const topicsWithEvents = Topics.topicsWithUnseenEvents(user._id, community._id, Meteor.users.SEEN_BY.NOTI);
    const topicsToDisplay = topicsWithEvents.filter(t => t.hasThingsToDisplay());
    const frequencyKey = 'schemaUsers.settings.notiFrequency.' + user.settings.notiFrequency;
    if (topicsToDisplay.length > 0) {
      EmailSender.send({
        to: user.getPrimaryEmail(),
        subject: EmailTemplateHelpers.subject('Notifications', user, community),
        template: 'Notifications_Email',
        data: {
          type: 'Notifications',
          alertColor: 'alert-good',
          userId: user._id,
          communityId: community._id,
          topicsToDisplay,
          notificationInstructions: TAPi18n.__('defaultNotificationInstructions', {}, user.settings.language),
          footer: TAPi18n.__('email.NotificationFooter', { link: FlowRouterHelpers.urlFor('User data page'), adminEmail: community.admin().profile.publicEmail, frequency: frequencyKey }, user.settings.language),
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
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}

//--------------------------------------------------------------

export const EXPIRY_NOTI_DAYS = 3;

export function notifyExpiringVotings() {
  debugAssert(Meteor.isServer);
  Communities.find().forEach((community) => {
    const expiringVotings = Topics.find({
      communityId: community._id,
      category: 'vote',
      closed: false,
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
            type: 'Notifications',
            alertColor: 'alert-warning',
            userId: user._id,
            communityId: community._id,
            topics: notVotedYetVotings,
          },
        });
      }
    });
  });
}
