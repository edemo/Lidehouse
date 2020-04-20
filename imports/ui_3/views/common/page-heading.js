import { Template } from 'meteor/templating';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import './page-heading.html';

Template.Page_heading.helpers({
  smallTitle() {
    return this.smallTitle || this.title;
  },
});
