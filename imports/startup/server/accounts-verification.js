import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';

export function cleanExpiredEmails() {
  const twoWeeksAgo = moment().subtract(2, 'week').toDate();
  // Meteor.users.find({ 'emails.0.verified' : false })
  Meteor.users.find({ 'services.email.verificationTokens': { $exists: true } }).forEach((user) => {
    const expiredTokens = user.services.email.verificationTokens.filter(token => token.when < twoWeeksAgo);
    expiredTokens.forEach((token) => {
      const email = token.address;
      Meteor.users.update({ _id: user._id }, { $pull: { emails: { address: email } } });
      Meteor.users.update({ _id: user._id }, { $pull: { 'services.email.verificationTokens': { address: email } } });
    });
  });
  // You can overwrite password.reset.enroll with "forgot email", whoever does not click on password reset link in two weeks should be deleted?
  // Meteor.users.find({ 'services.password.reset': { $exists: true } }).forEach((user) => {
  Meteor.users.find({ 'services.password.reset.reason': 'enroll' }).forEach((user) => {
    if (user.services.password.reset.when < twoWeeksAgo) {
      const email = user.services.password.reset.email;
      Meteor.users.update({ _id: user._id }, { $pull: { emails: { address: email } } });
      Meteor.users.update({ _id: user._id }, { $unset: { 'services.password.reset': { email } } });
    }
  });
  Meteor.users.find({ 'emails.address': { $exists: false } }).forEach((user) => {
    Meteor.users.remove({ _id: user._id });
  });
  return true;
}
