import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { numeral } from 'meteor/numeral:numeral';
import { __ } from '/imports/localization/i18n.js';

import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.viewmodel({
  autorun() {
    const communityId = Session.get('activeCommunityId');
    this.templateInstance.subscribe('breakdowns.inCommunity', { communityId });
    this.templateInstance.subscribe('balances.ofSelf', { communityId });
  },
  ownedParcels() {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    if (!user || !communityId) return [];
    return user.ownedParcels(communityId);
  },
  balance() {
//    const communityId = Session.get('activeCommunityId');
    const parcels = this.ownedParcels();
    let result = 0;
    parcels.forEach((parcel) => {
//      result += Balances.getTotal({ communityId, account: '33', localizer: Localizer.parcelRef2code(parcel.ref), tag: 'T' });
      result += parcel.payerPartner().outstanding;
    });
    return (-1) * result;
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

