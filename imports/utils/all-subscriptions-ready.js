import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

// Implemented by AI, but does not seems to work. Never returns true.

// Define a reactive variable to track subscription readiness
const allSubscriptionsReadyDep = new Tracker.Dependency();
let allSubscriptionsReadyState = false;

// Function to check if all subscriptions are ready
function checkAllSubscriptionsReady() {
  const handles = Meteor.connection._subscriptions; // Access all subscription handles
  const allReady = Object.keys(handles).every(
    (subId) => handles[subId].ready
  );
  
  if (allReady !== allSubscriptionsReadyState) {
    allSubscriptionsReadyState = allReady;
    allSubscriptionsReadyDep.changed(); // Trigger reactivity
  }
}

// Run a Tracker.autorun to monitor subscription changes
Tracker.autorun(() => {
  // This will re-run whenever any subscription's ready state changes
  Object.keys(Meteor.connection._subscriptions).forEach((subId) => {
    // Access the subscription handle
    const handle = Meteor.connection._subscriptions[subId];
    // Depend on the ready state to make it reactive
    handle.ready; // This triggers Tracker dependency
  });
  checkAllSubscriptionsReady();
});

// Reactive function to check if all subscriptions are ready
export function allSubscriptionsReady() {
  allSubscriptionsReadyDep.depend(); // Register dependency
  return allSubscriptionsReadyState;
}