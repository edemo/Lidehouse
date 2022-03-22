import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './journals-check.html';

Template.Journals_check.viewmodel({
  balanceStat: null,
  txStat: null,
  onCreated(instance) {
    const communityId = this.templateInstance.data.communityId;
    Meteor.call('balances.checkAllCorrect', { communityId },
      (error, result) => { this.balanceStat(result); },
    );
    Meteor.call('transactions.statistics', { communityId },
      (error, result) => { this.txStat(result); },
    );
  },
});

Template.Journals_check.events({
  'click .js-fix-balances'(event, instance) {
    const communityId = instance.data.communityId;
    Meteor.call('balances.ensureAllCorrect', { communityId },
      (error, result) => {
        if (error) console.log(error);
        else {
          Meteor.call('balances.checkAllCorrect', { communityId },
            (err, res) => { instance.viewmodel.balanceStat(res); },
          );
        }
      },
    );
  },
});
