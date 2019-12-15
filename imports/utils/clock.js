import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { debugAssert } from '/imports/utils/assert.js';

let simulatedTime = null;

export const Clock = {
  currentTime() {
    if (simulatedTime) return simulatedTime;
    return new Date();
  },
  currentDate() {
    return moment(Clock.currentTime()).endOf('date').toDate();
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
  // WARNING: Calling these methods will make everyone see a modified Time.
  // Dont forget to call clear() after you are done!!!
  setSimulatedTime(time) {
    simulatedTime = time || new Date();
  },
  starts(...args) {
    debugAssert(args.length === 3 && args[2] === 'ago');
    Clock.setSimulatedTime(moment().subtract(args[0], args[1]).toDate());
  },
  tick(...args) {
    const newTime = moment(simulatedTime).add(...args).toDate();
    Clock.setSimulatedTime(newTime);
    return newTime;
  },
  tickSome(arg) {
    const some = Math.floor(Math.random() * 10) + 1;
    const newTime = moment(simulatedTime).add(some, arg).toDate();
    Clock.setSimulatedTime(newTime);
    return newTime;
  },
  subtract(...args) {
    Clock.setSimulatedTime(moment(simulatedTime).subtract(...args).toDate());
  },
  clear() {
    simulatedTime = null;
  },
};
