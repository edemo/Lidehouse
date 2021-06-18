import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

export const ActiveTimeMachine = {
  _destinationTime: null, // null means NOW
  _restoreTime: undefined,
  _selector(time) {
    if (time === undefined) return {};
    else if (time === null) return { active: true };
    else if (time instanceof Date) {
      return {
        $and: [{
          $or: [
            { 'activeTime.begin': { $exists: false } },
            { 'activeTime.begin': { $lte: time } },
          ],
        }, {
          $or: [
            { 'activeTime.end': { $exists: false } },
            { 'activeTime.end': { $gt: time } },
          ],
        }],
      };
    }
    debugAssert(false, 'Unsupported destination time');
    return undefined;
  },
  selector() {
    return this._selector(this._destinationTime);
  },
  isSimulating() {
    return Meteor.isServer && this._destinationTime;  // The client is not supposed to be simulating
  },
  runAtTime(time, func) {
    this._restoreTime = this._destinationTime;
    this._destinationTime = time;
    try { func(); }
//    catch (err) { throw err; }
    finally {
      this._destinationTime = this._restoreTime || null;
      this._restoreTime = undefined;
    }
  },
  runNow(func) {  // this is the default, so no need to call it explicitly
    this.runAtTime(null, func);
  },
  runDisabled(func) {
    this.runAtTime(undefined, func);
  },
};
