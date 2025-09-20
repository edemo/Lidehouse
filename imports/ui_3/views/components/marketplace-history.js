import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { debugAssert } from '/imports/utils/assert.js';
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
  color(relation) {
//    if (amount < -50000) return 'danger';
//    else if (amount < -25000) return 'warning';
//    else
    if (relation === 'customer') return 'info';
    else { debugAssert(relation === 'supplier'); return 'primary'; }
  },
  signIcon(relation) {
    if (relation === 'customer') return 'fa-minus-square';
    else { debugAssert(relation === 'supplier'); return 'fa-plus-square'; }
  },
  directionIcon(relation) {
    if (relation === 'customer') return 'fa-arrow-left';
    else { debugAssert(relation === 'supplier'); return 'fa-arrow-right'; }
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
