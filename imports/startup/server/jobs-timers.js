import { Meteor } from 'meteor/meteor';
import { later } from 'meteor/mrt:later';

import { closeClosableVotings, openScheduledVotings } from '/imports/api/topics/votings/methods.js';
import { closeInactiveTopics } from '/imports/api/topics/methods.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { cleanCanceledVoteAttachments } from '/imports/api/shareddocs/methods.js';
import { emptyOldTrash } from '/imports/api/behaviours/trash.js';
import { processNotifications, notifyExpiringVotings } from '/imports/email/notifications-send.js';
import { Log } from '/imports/utils/log.js';

const job = (func, ...params) => {
  const wrappedFunc = function () {
    const start = Date.now();
    func(...params);
    const finish = Date.now();
    Log.info('Job', func.name, finish - start, 'ms');
  };
  return Meteor.bindEnvironment(wrappedFunc, (err) => { Log.error(err); });
};

Meteor.startup(() => {
  const dailySchedule = later.parse.recur().on(0).hour();

  job(closeClosableVotings)();
  job(closeInactiveTopics)();
  job(openScheduledVotings)();
//  later.setInterval(job(cleanExpiredEmails), dailySchedule);    - who doesn't accept invite, still gets weekly noti emails
//  later.setInterval(job(cleanCanceledVoteAttachments), dailySchedule);    - too dangerous
  later.setInterval(job(emptyOldTrash), dailySchedule);
  later.setInterval(job(notifyExpiringVotings), dailySchedule);
  later.setInterval(job(closeClosableVotings), dailySchedule);
  later.setInterval(job(closeInactiveTopics), dailySchedule);
  later.setInterval(job(openScheduledVotings), later.parse.recur().on(1).hour());

  later.setInterval(job(processNotifications, 'frequent'), later.parse.recur().on(8, 12, 16, 20).hour());
  later.setInterval(job(processNotifications, 'daily'), later.parse.recur().on(18).hour());
  later.setInterval(job(processNotifications, 'weekly'), later.parse.recur().on(6).dayOfWeek().on(14).hour());
});
