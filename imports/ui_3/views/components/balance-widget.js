import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

import { Balances } from '/imports/api/journals/balances/balances.js';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.onCreated(function() {
  // Subscriptions
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('breakdowns.inCommunity', { communityId });
    this.subscribe('balances.inCommunity', { communityId });
  });
});

Template.Balance_widget.helpers({
  balance() {
    const communityId = Session.get('activeCommunityId');
    const user = Meteor.user();
    if (!user || !communityId) return 0;
    const parcels = user.ownedParcels(communityId);
    let result = 0;
    parcels.forEach((parcel) => {
      result += Balances.get({ communityId, localizer: parcel.ref, tag: 'T' });
    });
    return result;
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

