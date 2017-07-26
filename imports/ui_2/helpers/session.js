import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.registerHelper('fromSession', function fromSession(paramName) {
  return Session.get(paramName);
});
