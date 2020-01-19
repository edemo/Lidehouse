import { Meteor } from 'meteor/meteor';
import { later } from 'meteor/mrt:later';

import { closeClosableVotings, openScheduledVotings } from '/imports/api/topics/votings/methods.js';
import { closeInactiveTopics } from '/imports/api/topics/methods.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { cleanCanceledVoteAttachments } from '/imports/api/shareddocs/methods.js';
import { processNotifications, notifyExpiringVotings } from '/imports/email/notifications-send.js';

const bindEnv = func => Meteor.bindEnvironment(func, (err) => { throw err; });

Meteor.startup(() => {
  const dailySchedule = later.parse.recur().on(0).hour();

  closeClosableVotings();
  closeInactiveTopics();
  openScheduledVotings();
//  later.setInterval(bindEnv(cleanExpiredEmails), dailySchedule);    - who doesn't accept invite, still gets weekly noti emails
//  later.setInterval(bindEnv(cleanCanceledVoteAttachments), dailySchedule);    - too dangerous
  later.setInterval(bindEnv(notifyExpiringVotings), dailySchedule);
  later.setInterval(bindEnv(closeClosableVotings), dailySchedule);
  later.setInterval(bindEnv(closeInactiveTopics), dailySchedule);
  later.setInterval(bindEnv(() => openScheduledVotings()), later.parse.recur().on(1).hour());

  later.setInterval(bindEnv(() => processNotifications('frequent')), later.parse.recur().on(8, 12, 16, 20).hour());
  later.setInterval(bindEnv(() => processNotifications('daily')), later.parse.recur().on(18).hour());
  later.setInterval(bindEnv(() => processNotifications('weekly')), later.parse.recur().on(6).dayOfWeek().on(14).hour());
});
