import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { debugAssert } from '/imports/utils/assert.js';

let _simulatedTime = null;
let _startRealTime = null;

export function datePartOnly(date = new Date()) {
  return moment(moment.utc(date)).startOf('day').toDate();
}

export const Clock = {
  REAL_TIME_PASS: false,
  AUTO_TICK: 0, // given in milliseconds
  currentTime() {
    if (!_simulatedTime) return new Date();
    if (this.AUTO_TICK) _simulatedTime = new Date(_simulatedTime.getTime() + this.AUTO_TICK);
    if (this.REAL_TIME_PASS) return new Date(_simulatedTime.getTime() + (Date.now() - _startRealTime));
    return _simulatedTime;
  },
  currentDate() {
    return datePartOnly(Clock.currentTime());
  },
  _moment(...args) {
    debugAssert(args.length === 3);
    if (args[2] === 'ago') return moment(Clock.currentTime()).subtract(args[0], args[1]);
    if (args[2] === 'ahead') return moment(Clock.currentTime()).add(args[0], args[1]);
    debugAssert(false); return undefined;
  },
  time(...args) {
    return Clock._moment(...args).toDate();
  },
  date(...args) {
    return Clock._moment(...args).endOf('date').toDate();
  },
  runAt(time, func) {
    _simulatedTime = time;
    func();
    _simulatedTime = null;
  },
  // WARNING: Calling these methods will make everyone see a modified Time.
  // Dont forget to call clear() after you are done!!!
  setSimulatedTime(time) {
    _simulatedTime = time;
    _startRealTime = Date.now();
  },
  starts(...args) {
    debugAssert(args.length === 3 && args[2] === 'ago');
    Clock.setSimulatedTime(moment().subtract(args[0], args[1]).toDate());
  },
  tick(...args) {
    const newTime = moment(_simulatedTime).add(...args).toDate();
    Clock.setSimulatedTime(newTime);
    return newTime;
  },
  tickSome(arg) {
    const some = Math.floor(Math.random() * 10) + 1;
    const newTime = moment(_simulatedTime).add(some, arg).toDate();
    Clock.setSimulatedTime(newTime);
    return newTime;
  },
  subtract(...args) {
    Clock.setSimulatedTime(moment(_simulatedTime).subtract(...args).toDate());
  },
  clear() {
    _simulatedTime = null;
    _startRealTime = null;
  },
};
