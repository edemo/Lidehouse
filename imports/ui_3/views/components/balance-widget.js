import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';

import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';
import { equalWithinUnit } from '/imports/localization/localization.js';

import { Partners } from '/imports/api/partners/partners.js';
import { Balances } from '/imports/api/accounting/balances/balances';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.viewmodel({
  autorun() {
    const user = Meteor.user();
    const communityId = getActiveCommunityId();
    const partnerId = user && user.partnerId(communityId);
    this.templateInstance.subscribe('transactions.byPartnerContract', { communityId, partnerId, outstanding: true });
  },
  partnerId() {
    const user = Meteor.user();
    const communityId = getActiveCommunityId();
    const partnerId = user.partnerId(communityId);
    return partnerId;
  },
  partner() {
    return Partners.findOne(this.partnerId());
  },
  balance() {
    const partner = this.partner();
    return partner?.balance();
  },
  display(balance) {
    const signPrefix = balance > 0 ? '+' : '';
    return signPrefix + numeral(balance).format();
  },
  isZeroWithinUnit(balance) {
    return equalWithinUnit(balance, 0, getActiveCommunity()?.settings.language, 'bank');
  },
  message(balance) {
    const partner = this.partner();
    if (this.isZeroWithinUnit(balance)) return __('Your Parcel Balance');
    if (balance > 0) return __('You have overpayment');
    else if (balance < 0) {
      if (partner && partner.mostOverdueDays()) return __('You have overdue payments');
      else return __('You have due payments');
    }
    return __('Your Parcel Balance');
  },
  colorClass(balance) {
    const partner = this.partner();
    if (this.isZeroWithinUnit(balance)) return 'navy-bg';
    if (balance < 0) {
      return 'bg-' + (partner && partner.mostOverdueDaysColor());
    }
    return 'navy-bg';
  },
  icon(balance) {
    if (this.isZeroWithinUnit(balance)) return 'fa fa-thumbs-up';
    if (balance < 0) return 'glyphicon glyphicon-exclamation-sign';
    return 'fa fa-thumbs-up';
  },
  publishDate() {
    const bal = Balances.findOne({ communityId: this.partner()?.communityId, partner: new RegExp('^' + this.partnerId()), tag: 'T' });
    return bal?.updatedAt || new Date('2000-01-01');
  },
});
