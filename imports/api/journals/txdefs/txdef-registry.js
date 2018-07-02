import { IncomeTx } from './income.js';
import { ExpenseTx } from './expense.js';
import { MoneyTransferTx } from './money-transfer.js';
import { OpeningBalanceTx } from './opening-balance.js';
import { BackOfficeTx } from './back-office.js';

export const TxDefRegistry = [IncomeTx, ExpenseTx, MoneyTransferTx, OpeningBalanceTx, BackOfficeTx];

