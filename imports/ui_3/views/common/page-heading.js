import { Template } from 'meteor/templating';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import './page-heading.html';

Template.Page_heading.helpers({
    smallTitle() {
        return this.smallTitle || this.title;
    },
    printable() {
      const routeName = FlowRouter.getRouteName();
      if (routeName === 'Transaction show') {
        const _txid = FlowRouter.getParam('_txid');
        const tx = Transactions.findOne(_txid);
        return tx && tx.category === 'bill';
      }
      return false;
    },
});

Template.Page_heading.events({
    'click .print'() {
        window.print();
    },
});
