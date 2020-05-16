import { Session } from 'meteor/session';

export function resetSession() {
  Object.keys(Session.keys).forEach(function unset(key) {
    Session.set(key, undefined);
  });
  Session.keys = {};
  Session.set('modalContext', {});
}
