import { Meteor } from 'meteor/meteor';

let simulatedTime = null;

export const Clock = {
  currentTime() { 
    if (simulatedTime) return simulatedTime;
    return new Date();
  },
  // WARNING: Calling this will make everyone see this as the actual Time.
  // Dont forget to call clear after you are done!!!
  setSimulatedTime(time) {
    simulatedTime = time;
  },
  clear() {
    simulatedTime = null;
  },
}
