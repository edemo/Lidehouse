import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { numeral } from 'meteor/numeral:numeral';

import { Payments } from '/imports/api/payments/payments.js';
import '/imports/api/users/users.js';
import './balance-widget.html';

Template.Balance_widget.onCreated(function() {
  // Subscriptions
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('payments.inCommunity', { communityId });
    this.subscribe('legs.inCommunity', { communityId });
  });
});

Template.Balance_widget.helpers({
  balance() {
    const communityId = Session.get('activeCommunityId');
    const user = Meteor.user();
    if (!user || !communityId) return 0;
    const result = user.balance(communityId);
    return result;
  },
  display(balance) {
    const signPrefix = balance > 0 ? '+' : '';
    return signPrefix + numeral(balance).format();
  },
  message(balance) {
    if (balance > 0) return 'Önnek túlfizetése van';
    else if (balance < 0) return 'Önnek tartozása van';
    return 'Túlfizetés/hátralék';
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

