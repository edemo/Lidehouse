import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.viewmodel({
  autorun() {
    const communityId = getActiveCommunityId();
    this.templateInstance.subscribe('transactions.outstanding', { communityId });
    this.templateInstance.subscribe('memberships.ofUser', { userId: Meteor.userId() });
  },
  partner() {
    const user = Meteor.user();
    const communityId = getActiveCommunityId();
    const partnerId = user.partnerId(communityId);
    return Partners.findOne(partnerId);
  },
  balance() {
    return (-1) * this.partner().outstanding;
  },
  display(balance) {
    const signPrefix = balance > 0 ? '+' : '';
    return signPrefix + numeral(balance).format();
  },
  message(balance) {
    if (balance > 0) return __('You have overpayment');
    else if (balance < 0) {
      if (this.partner().mostOverdueDays()) return __('You have overdue payments');
      else return __('You have due payments');
    }
    return __('Your Parcel Balance');
  },
  colorClass(balance) {
    if (balance < 0) {
      return 'bg-' + this.partner().mostOverdueDaysColor();
    }
    return 'navy-bg';
  },
  icon(balance) {
    if (balance < 0) return 'glyphicon glyphicon-exclamation-sign';
    return 'fa fa-thumbs-up';
  },
});

