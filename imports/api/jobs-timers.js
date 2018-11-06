import { Meteor } from 'meteor/meteor';
import { Jobs, JobsInternal } from 'meteor/msavin:sjobs';
import { moment } from 'meteor/momentjs:moment';
import { closeVoteFulfill } from '/imports/api/topics/votings/methods.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';

Jobs.register({
  'autoCloseVote': function (topicId) {
    const close = closeVoteFulfill(topicId);
    if (close) {
      this.success();
    } else {
      this.reschedule({
        in: {
          minutes: 5,
        },
      });
    }
  },
  'autoCleanExpiredEmails': function () {
    const clean = cleanExpiredEmails();
    if (clean) {
      this.replicate({
        in: {
          hours: 24,
        },
      });
      this.success();
    } else {
      this.reschedule({
        in: {
          minutes: 5,
        },
      });
    }
  },
});

const tillMidnight = moment.utc().endOf('day') - moment.utc();

Meteor.startup(function() {
  Jobs.clear('*', 'autoCleanExpiredEmails');
  Jobs.run('autoCleanExpiredEmails', {
    in: {
      milliseconds: tillMidnight,
    },
  });
});