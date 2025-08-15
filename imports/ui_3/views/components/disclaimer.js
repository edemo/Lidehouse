import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { Balances } from '/imports/api/accounting/balances/balances';
import './disclaimer.html';

Template.Disclaimer.helpers({
  publishDate() {
    const publishedBalance = Balances.findOne({}, { sort: { updatedAt: -1 } });
    return publishedBalance?.updatedAt || new Date('2000-01-01');
  },
});
