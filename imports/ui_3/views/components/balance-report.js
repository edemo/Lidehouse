import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { numeral } from 'meteor/numeral:numeral';

import { Balances } from '/imports/api/journals/balances/balances.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { PeriodBreakdown } from '/imports/api/journals/breakdowns/breakdowns-utils.js';
import './balance-report.html';

Template.Balance_report.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('balances.ofAccounts', { communityId });
  });
});

Template.Balance_report.helpers({
  balance(account, tag) {
    const balanceDef = {
      communityId: Session.get('activeCommunityId'),
      account: account.code,
      tag,
    };
    return Balances.get(balanceDef);
  },
  displayAccount(account) {
    return Breakdowns.display(account);
  },
  displayCell(number) {
    return numeral(number).format('0.0 a');
  },
  displayPeriod(tag) {
    const node = PeriodBreakdown.nodeByCode(tag);
    return node.label;
  },
});
