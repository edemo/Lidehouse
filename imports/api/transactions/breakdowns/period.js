import { moment } from 'meteor/momentjs:moment';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns } from './breakdowns.js';

export const monthTags = {
  name: 'months',
  children: [
  { digit: '-01', name: '01', label: 'JAN' },
  { digit: '-02', name: '02', label: 'FEB' },
  { digit: '-03', name: '03', label: 'MAR' },
  { digit: '-04', name: '04', label: 'APR' },
  { digit: '-05', name: '05', label: 'MAY' },
  { digit: '-06', name: '06', label: 'JUN' },
  { digit: '-07', name: '07', label: 'JUL' },
  { digit: '-08', name: '08', label: 'AUG' },
  { digit: '-09', name: '09', label: 'SEP' },
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

export const PeriodBreakdown = Breakdowns._transform(periodTags);

export class Period {
  constructor(label) {  // label format: '2018-09' or '2019'
    const split = label.split('-');
//    debugAssert(split.length === 2);  // we allow traditional js date to come in, and we drop the day
    this.year = split[0];
    this.month = split[1];
    this.label = this.year;
    if (this.month) this.label += '-' + this.month;
  }
  static fromTag(tag) {   // tag format: 'T-2018-09' or 'T-2019' or 'T'
    return new Period(tag.substr(2));
  }
  static monthOfDate(date) {
    return new Period(moment(date).format('YYYY-MM'));
  }
  static yearOfDate(date) {
    return new Period(moment(date).format('YYYY'));
  }
  type() {
    if (!this.year) return 'total';
    else if (!this.month) return 'year';
    else return 'month';
  }
  begin(format = 'YYYY-MM-DD') {
    let date;
    if (!this.year) date = moment(0);
    else if (!this.month) date = moment([this.year]).startOf('year');
    else date = moment([this.year, this.month - 1]).startOf('month');
    return date.format(format);
  }
  end(format = 'YYYY-MM-DD') {
    let date;
    if (!this.year) date = moment();
    else if (!this.month) date = moment([this.year]).endOf('year');
    else date = moment([this.year, this.month - 1]).endOf('month');
    return date.format(format);
  }
  toString() {
    return this.label;
  }
}

PeriodBreakdown.currentMonthTag = function () {
  const now = new Date();
  return `T-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
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
