import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Parcels } from '/imports/api/parcels/parcels';
import { Contracts } from '/imports/api/contracts/contracts';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';

import './payment-view.html';

Template.Payment_view.viewmodel({
  onCreated(instance) {
    instance.subscribe('transactions.byId', { _id: this.templateInstance.data.doc._id });
  },
  reactiveDoc() {
    return Transactions.findOne(this.templateInstance.data.doc._id);
  },
  showBills() {
    const doc = this.reactiveDoc();
    return doc.bills?.length;
  },
  showLines() {
    const doc = this.reactiveDoc();
    return doc.lines?.length;
  },
  allocations() {
    const payment = this.reactiveDoc();
    const allocationIds = payment.allocations;
    const allocations = [];
    allocationIds?.forEach(id => allocations.push(Transactions.findOne(id)));
    return allocations;
  },
  displayBill(bp) {
    const bill = Transactions.findOne(bp.id);
    return bill?.serialId;
  },
  displayContract(contractId) {
    if (!contractId) return '---';
    const contract = Contracts.findOne(contractId);
    return contract?.toString();
  },
});
