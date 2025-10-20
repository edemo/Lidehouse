/* globals document */
import { Template } from 'meteor/templating';

import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { validDateOrUndefined } from '/imports/api/utils';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries';
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
      instance.subscribe('accountingPeriods.inCommunity', { communityId });
      instance.subscribe('parcels.inCommunity', { communityId });
      instance.subscribe('txdefs.inCommunity', { communityId });
      const params = this.transactionsSubscriptionParams();
      if (params) {
        instance.subscribe('transactions.inCommunity', params);
        instance.subscribe('statements.inCommunity', params);
        instance.subscribe('statementEntries.inCommunity', params);
      }
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  noAccountsDefined() {
    if (!Template.instance().subscriptionsReady()) return false;
    return !Accounts.findOneT({ communityId: this.communityId() });
  },
  countUnpostedTxs() {
    const communityId = this.communityId();
    const txs = Transactions.find({ communityId, status: 'draft' });
    return txs.count();
  },
  countUnreconciledTxs() {
    const communityId = this.communityId();
    const txs = Transactions.find({ communityId, category: { $in: ['payment', 'receipt'] }, reconciled: false });
    return txs.count();
  },
  countOutstandingBills() {
    const communityId = this.communityId();
    const community = this.community();
    if (!community) return 0;
    const txs = Transactions.find({ communityId, category: 'bill', $and:
      [{ outstanding: { $ne: 0 } }, { relation: { $in: community.settings.paymentsToBills } }],
    });
    return txs.count();
  },
  countUnreconciledEntries() {
    const communityId = this.communityId();
    const ses = StatementEntries.find({ communityId, reconciled: false });
    return ses.count();
  },
});
