import { Jobs } from 'meteor/msavin:sjobs';
import { closeVoteFulfill } from '/imports/api/topics/votings/methods.js';

Jobs.register({
  "autoCloseVote": function (topicId) {
    const close = closeVoteFulfill(topicId);
    if (close) {
      this.success()
    } else {
      this.reschedule({
        in: {
          minutes: 5
        }
      })
    }
  }
});
