import { UI } from 'meteor/blaze';
import { Session } from 'meteor/session';

UI.registerHelper('fromSession', function fromSession(paramName) {
  return Session.get(paramName);
});
