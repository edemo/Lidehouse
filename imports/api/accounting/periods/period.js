import { moment } from 'meteor/momentjs:moment';

import { debugAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';

export class Period {
  constructor(label) { // label format: '2018-09' or '2019'
    const split = label.split('-');
//    debugAssert(split.length === 2);  // we allow traditional js date to come in, and we drop the day
    this.year = split[0];
    this.month = split[1];
    const day = split[2];
    debugAssert(!day, 'Day defined period currently not supperted');
    if (day) {  // We allow creating a period, with its last day
      const date = moment(label);
      debugAssert(date.date() === date.daysInMonth(), 'period closing date has to be last day of month');
    }
    this.label = this.year;
    if (this.month) this.label += '-' + this.month;
  }

  static fromValues(year, month) {
    let label = '';
    if (year) label += '' + year;
    if (month) label += '-' + ('' + month).padStart(2, '0');
    return new Period(label);
  }

  static fromBeginEndDates(begin, end) {
    // Currently we only support full year period to watch
    const beginYear = begin?.getFullYear();
    const endYear = end?.getFullYear();
    const year = (beginYear === endYear) ? beginYear : undefined;
    return Period.fromValues(year);
  }

  static fromTag(tag) { // tag format: 'T-2018-09' or 'T-2019' or 'T'
    return new Period(tag.substr(2));
  }

  static monthOfDate(date) {
    return new Period(moment(date).format('YYYY-MM'));
  }

  static yearOfDate(date) {
    return new Period(moment(date).format('YYYY'));
  }

  previous() {
    let prevPeriod;
    if (!this.year) debugAssert(false, 'entire period has no previous');
    else if (!this.month || this.month == 1) prevPeriod = Period.fromValues(parseInt(this.year) - 1);
    else prevPeriod = Period.fromValues(this.year, parseInt(this.month) - 1);
    return prevPeriod;
  }

  next() {
    let nextPeriod;
    if (!this.year) debugAssert(false, 'entire period has no next');
    else if (!this.month || this.month == 12) nextPeriod = Period.fromValues(parseInt(this.year) + 1);
    else nextPeriod = Period.fromValues(this.year, parseInt(this.month) + 1);
    return nextPeriod;
  }
  type() {
    if (!this.year) return 'entire';
    else if (!this.month) return 'year';
    else return 'month';
  }

  begin(format = 'YYYY-MM-DD') {
    let date;
    if (!this.year) date = moment.utc(0);
    else if (!this.month) date = moment.utc([this.year]).startOf('year');
    else date = moment.utc([this.year, this.month - 1]).startOf('month');
    return date.format(format);
  }

  end(format = 'YYYY-MM-DD') {
    let date;
    if (!this.year) date = moment.utc();
    else if (!this.month) date = moment.utc([this.year]).endOf('year');
    else date = moment.utc([this.year, this.month - 1]).endOf('month');
    return date.format(format);
  }

  beginDate() {
    return moment.utc(this.begin()).toDate();
  }

  endDate() {
    return moment.utc(this.end()).toDate();
  }

  beginsOnYearBegin() {
    return (!this.month || this.month == 1);
  }

  endsOnYearEnd() {
    return (!this.month || this.month == 12);
  }

  toString() {
    return this.label;
  }

  toTag() {
    let result = 'T';
    if (this.label?.length) result += '-' + this.label;
    return result;
  }
}

Period.date2tag = function date2tag(date, tagLetter) {
  return `${tagLetter}-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};
Period.endOfLastMonthTag = function endOfLastMonthTag() {
  const lastMonth = moment().subtract(1, 'month').toDate();
  return Period.date2tag(lastMonth, 'C');
};
Period.currentMonthTag = function currentMonthTag() {
  const now =  Clock.currentTime();
  return Period.date2tag(now, 'T');
};
Period.currentYearTag = function () {
  const now = Clock.currentTime();
  return `T-${now.getFullYear()}`;
};
Period.lastYearTag = function () {
  const now = Clock.currentTime();
  return `T-${now.getFullYear() - 1}`;
};
Period.nextYearTag = function (tag = Period.currentYearTag()) {
  const period = Period.fromTag(tag);
  return `T-${period.year + 1}`;
};
