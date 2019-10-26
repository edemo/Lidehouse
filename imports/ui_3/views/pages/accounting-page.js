/* globals document */
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import '/imports/ui_3/views/components/accounting-bills.js';
import '/imports/ui_3/views/components/accounting-transactions.js';
import '/imports/ui_3/views/components/accounting-breakdowns.js';
import '/imports/ui_3/views/components/accounting-reconciliation.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries';
import './accounting-page.html';

Template.Accounting_page.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('partners.inCommunity', { communityId });
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('bills.outstanding', { communityId });
      instance.subscribe('payments.unreconciled', { communityId });
      instance.subscribe('statementEntries.unreconciled', { communityId });
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  countUnconteeredBills() {
    const communityId = this.communityId();
    return Bills.find({ communityId, txId: { $exists: false } }).count();
  },
  countUnreconciledPayments() {
    const communityId = this.communityId();
    return Payments.find({ communityId, reconciledId: { $exists: false } }).count();
  },
  countOutstandingBills() {
    const communityId = this.communityId();
    return Bills.find({ communityId, outstanding: { $gt: 0 } }).count();
  },
  countUnreconciledEntries() {
    const communityId = this.communityId();
    return StatementEntries.find({ communityId, reconciledId: { $exists: false } }).count();
  },
});
