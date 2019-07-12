import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { debugAssert } from '/imports/utils/assert.js';

let simulatedTime = null;

export const Clock = {
  currentTime() {
    if (simulatedTime) return simulatedTime;
    return new Date();
  },
  time(...args) {
    debugAssert(args.length === 3);
    if (args[2] === 'ago') return moment(Clock.currentTime()).subtract(args[0], args[1]).toDate();
    if (args[2] === 'ahead') return moment(Clock.currentTime()).add(args[0], args[1]).toDate();
    debugAssert(false); return undefined;
  },
  // WARNING: Calling these methods will make everyone see a modified Time.
  // Dont forget to call clear() after you are done!!!
  setSimulatedTime(time) {
    simulatedTime = time;
  },
  starts(...args) {
    debugAssert(args.length === 3 && args[2] === 'ago');
    Clock.setSimulatedTime(moment().subtract(args[0], args[1]).toDate());
  },
  tick(...args) {
    debugAssert(args.length === 2);
    Clock.setSimulatedTime(moment(simulatedTime).add(...args).toDate());
  },
  tickSome(arg) {
    const some = Math.floor(Math.random() * 10) + 1;
    Clock.setSimulatedTime(moment(simulatedTime).add(some, arg).toDate());
  },
  clear() {
    simulatedTime = null;
  },
};
