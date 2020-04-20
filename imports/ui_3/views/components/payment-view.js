import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Parcels } from '/imports/api/parcels/parcels';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';

import './payment-view.html';

Template.Payment_view.viewmodel({
  onCreated(instance) {
  },
  displayBill(bp) {
    const bill = Transactions.findOne(bp.id);
    return bill && bill.serialId;
  },
});
