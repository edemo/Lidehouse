/* globals document */
import { Template } from 'meteor/templating';

import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries';
import '/imports/ui_3/views/components/accounting-bills.js';
import '/imports/ui_3/views/components/accounting-ledger.js';
import '/imports/ui_3/views/components/accounting-transactions.js';
import '/imports/ui_3/views/components/accounting-setup.js';
import '/imports/ui_3/views/components/accounting-reconciliation.js';
import '/imports/ui_3/views/components/accounting-filter.js';
import '/imports/ui_3/views/components/lazy-tab.js';
import './accounting-page.html';

Template.Accounting_page.viewmodel({
  share: 'accountingFilter',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
      instance.subscribe('accounts.inCommunity', { communityId });
      instance.subscribe('parcels.inCommunity', { communityId });
      instance.subscribe('txdefs.inCommunity', { communityId });
      const selector = {
        communityId: this.communityId(),
        begin: new Date(this.beginDate()),
        end: new Date(this.endDate()),
      };
      instance.subscribe('transactions.inCommunity', selector);
      instance.subscribe('statements.inCommunity', selector);
      instance.subscribe('statementEntries.inCommunity', selector);
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  noAccountsDefined() {
    if (!Template.instance().subscriptionsReady()) return false;
    return !Accounts.findOne({ communityId: this.communityId() });
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
