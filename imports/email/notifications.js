
import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import { emailSender } from '/imports/startup/server/email-sender.js';
import { Communities } from '../api/communities/communities';

function sendNotifications(user) {
  user.communities().forEach((community) => {
    const topicsWithEvents = Topics.topicsWithUnseenEvents(user._id, community._id, Meteor.users.SEEN_BY.NOTI);
    if (topicsWithEvents.length > 0) {
      emailSender.sendHTML({
        to: user.getPrimaryEmail(),
        subject: TAPi18n.__('email.NotificationSubject', { name: community.name }, user.settings.language),
        template: 'Notification_Email',
        data: {
          userId: user._id,
          communityId: community._id,
          topicsWithEvents,
        },
      });
      topicsWithEvents.forEach((te) => {
        const lastSeenInfo = { timestamp: new Date() };
        updateMyLastSeen._execute({ userId: user._id }, { topicId: te.topic._id, lastSeenInfo, seenType: Meteor.users.SEEN_BY.NOTI });
      });
    }
  });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}

export const EXPIRY_NOTI_DAYS = 3;

export function notifyExpiringVotings() {
  Communities.find().forEach((community) => {
    const expiringVotings = Topics.find({
      communityId: community._id,
      category: 'vote',
      closed: false,
      'vote.closesAt': {
        $gt: moment().add(EXPIRY_NOTI_DAYS, 'day').subtract(12, 'hour').toDate(),
        $lte: moment().add(EXPIRY_NOTI_DAYS, 'day').add(12, 'hour').toDate(),
      },
    }).fetch();
    if (expiringVotings.length === 0) return;
    community.voters().filter(v => v.settings.notiFrequency !== 'never').forEach((voter) => {
      const notVotedYetVotings = expiringVotings.filter((voting) => {
        return !voting.voteCastsIndirect[voter._id];
      });
      if (notVotedYetVotings.length > 0) {
        emailSender.sendHTML({
          to: voter.getPrimaryEmail(),
          subject: TAPi18n.__('email.NotificationSubject', { name: community.name }, voter.settings.language),
          template: 'Voteexpires_Email',
          data: {
            userId: voter._id,
            communityId: community._id,
            topics: notVotedYetVotings,
            alertColor: 'alert-warning',
          },
        });
      }
    });
  });
}
