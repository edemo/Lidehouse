import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

let destinationTime = null;

export const ActiveTimeMachine = {
  setDestinationNow() {
    destinationTime = 'NOW';
  },
  setDestinationTime(time) {
    destinationTime = time;
  },
  selector(time) {
    if (time === 'NOW') return { active: true };
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
            { 'activeTime.end': { $gte: time } },
          ],
        }],
      };
    }
    debugAssert(false, 'Unsupported destination time');
    return undefined;
  },
  extendSelector(selector) {
    if (!destinationTime) return;
    _.extend(selector, ActiveTimeMachine.selector(destinationTime));
  },
  clear() {
    destinationTime = null;
  },
};
