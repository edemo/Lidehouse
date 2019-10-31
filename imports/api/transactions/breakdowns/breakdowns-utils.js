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
  { digit: '-2010', name: '2010', include: monthTags },
  { digit: '-2011', name: '2011', include: monthTags },
  { digit: '-2012', name: '2012', include: monthTags },
  { digit: '-2013', name: '2013', include: monthTags },
  { digit: '-2014', name: '2014', include: monthTags },
  { digit: '-2015', name: '2015', include: monthTags },
  { digit: '-2016', name: '2016', include: monthTags },
  { digit: '-2017', name: '2017', include: monthTags },
  { digit: '-2018', name: '2018', include: monthTags },
  { digit: '-2019', name: '2019', include: monthTags },
  { digit: '-2020', name: '2020', include: monthTags },
  ],
};

const periodTags = {
  digit: 'T', name: 'Total', include: yearTags,
};

export class Period {
  constructor(tag) {
    const split = tag.split('-');
    this.year = split[1];
    this.month = split[2];
    if (this.month && this.month.length === 1) this.month = '0' + this.month;
  }
  begin() {
    if (!this.year) return '1970-01-01';
    return `${this.year}-${this.month || '01'}-01`;
  }
  end() {
    if (!this.year) return '2020-12-31'; // moment().format('YYYY-MM-DD');
    return `${this.year}-${this.month || '12'}-27`;
  }
}

export const PeriodBreakdown = Breakdowns._transform(periodTags);
PeriodBreakdown.currentMonthTag = function () {
  const now = new Date();
  return `T-${now.getFullYear()}-${now.getMonth() + 1}`;
};
PeriodBreakdown.currentYearTag = function () {
  const now = new Date();
  return `T-${now.getFullYear()}`;
};
PeriodBreakdown.lastYearTag = function () {
  const now = new Date();
  return `T-${now.getFullYear() - 1}`;
};
PeriodBreakdown.currentYearMonths = function () {
  const now = new Date();
  return PeriodBreakdown.fullYearMonths(now.getFullYear());
};

PeriodBreakdown.fullYearMonths = function (year) {
  return PeriodBreakdown.leafsOf(`T-${year}`).map(l => l.code);
};
