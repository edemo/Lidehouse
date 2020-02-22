/* globals document */
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries';
import '/imports/ui_3/views/components/accounting-bills.js';
import '/imports/ui_3/views/components/accounting-ledger.js';
import '/imports/ui_3/views/components/accounting-transactions.js';
import '/imports/ui_3/views/components/accounting-breakdowns.js';
import '/imports/ui_3/views/components/accounting-reconciliation.js';
import './accounting-page.html';

Template.Accounting_page.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('partners.inCommunity', { communityId });
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('transactions.outstanding', { communityId });
      instance.subscribe('transactions.unreconciled', { communityId });
      instance.subscribe('statementEntries.unreconciled', { communityId });
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  countUnpostedTxs() {
    const communityId = this.communityId();
    const txs = Transactions.find({ communityId, postedAt: { $exists: false } });
    return txs.count();
  },
  countUnreconciledTxs() {
    const communityId = this.communityId();
    const txs = Transactions.find({ communityId, category: { $in: ['payment', 'receipt'] }, seId: { $exists: false } });
    return txs.count();
  },
  countOutstandingBills() {
    const communityId = this.communityId();
    const txs = Transactions.find({ communityId, category: 'bill', outstanding: { $gt: 0 } });
    return txs.count();
  },
  countUnreconciledEntries() {
    const communityId = this.communityId();
    const ses = StatementEntries.find({ communityId, txId: { $exists: false } });
    return ses.count();
  },
});
