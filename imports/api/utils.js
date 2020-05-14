import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { checkExists } from '/imports/api/method-checks.js';

export function toggleElementInArray(collection, id, arrayName, element) {
  const object = checkExists(collection, id);
  const index = _.indexOf(object[arrayName], element);
  const action = (index >= 0) ? '$pull' : '$push';
  const modifier = { [action]: { [arrayName]: element } };
  collection.update(id, modifier);
}

export function toggle(element, array) {
  if (!Array.isArray(array)) array = [];
  if (array.includes(element)) return _.without(array, element);
  return array.concat([element]);
}

export function momentWithoutTZ(time) {
  const hours = time.hours();
  const mins = time.minutes();
  const dateObj = time.toDate();
  dateObj.setHours(hours);
  dateObj.setMinutes(mins);
  return dateObj;
}

export function equalWithinRounding(amount1, amount2) {
  return Math.abs(amount1 - amount2) < 5;
}

export function resetSession() {
  if (Meteor.isClient) {
    import { Session } from 'meteor/session';

    Object.keys(Session.keys).forEach(function unset(key) {
      Session.set(key, undefined);
    });
    Session.keys = {};
    Session.set('modalContext', {});
  }
}

export function doubleScroll(element) {
  element.wrap($('<div>', { class: 'ds-div2' }));
  const div2 = element.parent();
  div2.wrap($('<div>', { class: 'ds-wrapper2' }));
  const wrapper2 = div2.parent();
  const wrapper1 = $('<div class="ds-wrapper1"></div>').insertBefore('.ds-wrapper2');
  wrapper1.append('<div class="ds-div1"></div>');
  const div1 = wrapper1.children().first();

  wrapper1.css({
    'width': '100%',
    'overflow-x': 'scroll',
    'overflow-y': 'hidden',
    'height': '20px',
  });

  wrapper2.css({
    'width': '100%',
    'overflow-x': 'scroll',
    'overflow-y': 'hidden',
  });

  div1.css({
    'width': `${element.width()}`,
    'height': '20px'
  });

  div2.css({
    'overflow': 'none'
  });

  wrapper1.on('scroll', function () {
    wrapper2.scrollLeft(wrapper1.scrollLeft());
  });

  wrapper2.on('scroll', function () {
    wrapper1.scrollLeft(wrapper2.scrollLeft());
  });
}
