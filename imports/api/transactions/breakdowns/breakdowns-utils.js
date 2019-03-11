import { Breakdowns } from './breakdowns.js';

const sideTags = {
  name: 'sides', label: 'Balance',
  children: [
  { digit: 'debit', name: 'debit', label: 'done' },
  { digit: 'credit', name: 'credit', label: 'bill' },
  ],
};

export const SideBreakdown = Breakdowns._transform(sideTags);


export const monthTags = {
  name: 'months',
  children: [
  { digit: '-1', name: '01', label: 'JAN' },
  { digit: '-2', name: '02', label: 'FEB' },
  { digit: '-3', name: '03', label: 'MAR' },
  { digit: '-4', name: '04', label: 'APR' },
  { digit: '-5', name: '05', label: 'MAY' },
  { digit: '-6', name: '06', label: 'JUN' },
  { digit: '-7', name: '07', label: 'JUL' },
  { digit: '-8', name: '08', label: 'AUG' },
  { digit: '-9', name: '09', label: 'SEP' },
  { digit: '-10', name: '10', label: 'OCT' },
  { digit: '-11', name: '11', label: 'NOV' },
  { digit: '-12', name: '12', label: 'DEC' },
  ],
};

const yearTags = {
  name: 'years',
  children: [
  { digit: '-2017', name: '2017', include: monthTags },
  { digit: '-2018', name: '2018', include: monthTags },
  { digit: '-2019', name: '2019', include: monthTags },
  { digit: '-2020', name: '2020', include: monthTags },
  ],
};

const periodTags = {
  digit: 'T', name: 'Total', include: yearTags,
};

export const PeriodBreakdown = Breakdowns._transform(periodTags);
