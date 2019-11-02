import { Breakdowns } from './breakdowns.js';

const sideTags = {
  name: 'sides', label: 'Balance',
  children: [
  { digit: 'debit', name: 'debit', label: 'done' },
  { digit: 'credit', name: 'credit', label: 'bill' },
  ],
};

export const SideBreakdown = Breakdowns._transform(sideTags);
