import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import './marketplace-history.html';

Template.Marketplace_history.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
//      if (this.partnerSelected()) {
//        instance.subscribe('transactions.byPartnerContract', this.subscribeParams());
//      }
    });
  },
  communityId() {
    return ModalStack.getVar('communityId');
  },
  color(amount) {
    if (amount < -50000) return 'danger';
    else if (amount < -25000) return 'warning';
    else if (amount < 0) return 'info';
    else return 'primary';
  },
  icon(amount) {
    if (amount < 0) return 'fa-minus-square';
    else return 'fa-plus-square'
  },
  directionIcon(amount) {
    if (amount < 0) return 'arrow-left';
    else if (amount > 0) return 'arrow-right';
    else return 'question-mark'
  },
  abs(amount) {
    return Math.abs(amount);
  },
  historyWithTotalRows() {
    const history = this.templateInstance.data.marketHistory();
    const result = [{
        title: __('total') + 'offer',
        price: history.debit,
        otherPartner: () => ({
            user: () => ({
                avatar: 'avatarnull.png',
            }),
        }),
    }];
    return result.concat(history.deals);
  },
});

Template.Marketplace_history.events({
});
