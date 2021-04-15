import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Balances } from '/imports/api/transactions/balances/balances';
import './disclaimer.html';

Template.Disclaimer.helpers({
  publishDate() {
    const publishedBalance = Balances.findOne({ tag: 'T' }, { sort: { updatedAt: -1 } });
    return publishedBalance?.updatedAt || new Date('2000-01-01');
  },
});
