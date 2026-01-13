import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';

import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { ensureAllCorrect } from '/imports/api/accounting/balances/methods.js';
import { Period } from '/imports/api/accounting/periods/period.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';

AccountingPeriods.necessaryClosingTxs = function necessaryClosingTxs(communityId, tag) {
  const txs = [];
  const period = Period.fromTag(tag);
  let debitSum = 0;
  let creditSum = 0;
  const freeTxDef = Txdefs.getByName('Accounting operation', communityId);
  const freeTxBase = {
    communityId,
    category: 'freeTx',
    defId: freeTxDef._id,
    status: 'draft',
  }
  Accounts.nonCarriedBaseAccounts(communityId).forEach(account => {
    const balance = Balances.get({ communityId, account, tag });
    if (balance && (balance.credit !== balance.debit)) {
      debitSum += balance.debit;
      creditSum += balance.credit;
      const amountSide = balance.credit > balance.debit ? 'credit' : 'debit';
      const closingSide = balance.credit > balance.debit ? 'debit' : 'credit';
      const amount = Math.abs(balance.credit - balance.debit);
      const closingTx = _.extend({}, freeTxBase, {
        valueDate: period.endDate(),
        amount,
        [amountSide]: [{ account: '`493', amount }],
        [closingSide]: [{ account: account + '0', amount }],
        notes: `${account} számlaosztály zárása`,
      });
      txs.push(closingTx);
    }
  });
  if (txs.length) { 
    const amountSide = creditSum > debitSum ? 'credit' : 'debit';
    const closingSide = creditSum > debitSum ? 'debit' : 'credit';
    const amount = Math.abs(creditSum - debitSum);

    const gainTx = _.extend({}, freeTxBase, {
      valueDate: period.endDate(),
      amount,
      [amountSide]: [{ account: '`493', amount }],
      [closingSide]: [{ account: '`419', amount }],
      notes: 'Mérleg szerinti eredmény',
    });
    txs.push(gainTx);

    // If we did closing operations, we need to do opening operations in the next period
    const gainToReserveTx = _.extend({}, freeTxBase, {
      valueDate: period.next().beginDate(),
      amount,
      notes: 'Eredménytartalék képzése',
      [amountSide]: [{ account: '`419', amount }],
      [closingSide]: [{ account: '`413', amount }],
    });
    txs.push(gainToReserveTx);
  }
  return txs;
}
