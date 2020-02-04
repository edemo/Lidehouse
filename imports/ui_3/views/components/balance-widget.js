import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.viewmodel({
  balance() {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    const partnerId = user.partnerId(communityId);
    const partner = Partners.findOne(partnerId);
    return (-1) * partner.outstanding;
  },
  display(balance) {
    const signPrefix = balance > 0 ? '+' : '';
    return signPrefix + numeral(balance).format();
  },
  message(balance) {
    if (balance > 0) return __('You have overpayment');
    else if (balance < 0) return __('You have due payments');
    return __('Your Parcel Balance');
  },
  colorClass(balance) {
    if (balance < 0) return 'bg-danger';
    return 'navy-bg';
  },
  icon(balance) {
    if (balance < 0) return 'glyphicon glyphicon-exclamation-sign';
    return 'fa fa-thumbs-up';
  },
});

