import { Template } from 'meteor/templating';

import './balance-widget.html';

Template.Balance_widget.helpers({
  balance() {
    const userBalance = -14500; //TODO
    const signPrefix = userBalance > 0 ? '+' : '';
    return signPrefix + userBalance;
  },
  balanceMessage() {
    const userBalance = -14500; //TODO
    if (userBalance > 0) return 'Önnek túlfizetése van';
    else if (userBalance < 0) return 'Önnek tartozása van';
    return 'Túlfizetés/hátralék';
  },
  balanceColorClass() {
    const userBalance = -14500; //TODO
    if (userBalance < 0) return 'bg-danger';
    return 'navy-bg';
  },
  balanceIcon() {
    const userBalance = -14500; //TODO
    if (userBalance < 0) return 'glyphicon glyphicon-exclamation-sign';
    return 'fa fa-thumbs-up';
  },
});
