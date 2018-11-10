import { Meteor } from 'meteor/meteor';
import { later } from 'meteor/mrt:later';

import { closeClosableVotings } from '/imports/api/topics/votings/methods.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { processNotifications } from '/imports/startup/server/notifications.js';
import { cleanCanceledVoteAttachments } from '/imports/api/shareddocs/methods.js';

const bindEnv = func => Meteor.bindEnvironment(func, (err) => { throw err; });

Meteor.startup(() => {
  const dailySchedule = later.parse.recur().on(0).hour();

  closeClosableVotings();
  later.setInterval(bindEnv(closeClosableVotings), dailySchedule);
  later.setInterval(bindEnv(cleanExpiredEmails), dailySchedule);
  later.setInterval(bindEnv(cleanCanceledVoteAttachments), dailySchedule);

  later.setInterval(bindEnv(() => processNotifications('frequent')), later.parse.recur().on(8, 12, 16, 20).hour());
  later.setInterval(bindEnv(() => processNotifications('daily')), later.parse.recur().on(18).hour());
  later.setInterval(bindEnv(() => processNotifications('weekly')), later.parse.recur().on(6).dayOfWeek().on(14).hour());
});
