import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import './partner-rating.html';

Template.Market_balance.helpers({
  absValue() {
    return Math.abs(this.amount);
  },
  color() {
    if (this.amount < -50000) return 'danger';
    else if (this.amount < -25000) return 'warning';
    else if (this.amount < 0) return 'info';
    else return 'primary';
  },
  icon() {
    if (this.amount < 0) return 'fa-minus-square';
    else return 'fa-plus-square'
  },
});

Template.Partner_rating.events({
  'click .js-market-history'(event, instance) {
    Modal.show('Modal', {
      id: 'marketplacehistory.view',
      title: __('Marketplace history'),
      body: 'Marketplace_history',
      bodyContext: instance.data,
      size: 'lg',
    });
  },
});
