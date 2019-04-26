import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { numeral } from 'meteor/numeral:numeral';

// Global helpers for all email templates
// TODO: duplicates from the clients side - maybe we should try reference in the client helpers here?
export const EmailTemplateHelpers = {
  equals(a, b) {
    return a == b;
  },
  displayTime(time) {
    return moment(time).format('L LT');
  },
  _(text, kw) {
    const user = Meteor.users.findOne(this.userId);
    return TAPi18n.__(text, kw.hash, user.settings.language);
  },
  urlFor(route, hash = {}) {
    let result;
    if (route.charAt(0) === '/') {
      result = FlowRouterHelpers.urlFor(route, hash);
    } else { result = route; }
    return result;
  },
  displayPercent(number) {
    return numeral(number).format('0.00') + '%';
  },
};

// ------------- Sample ----------------
/*
export const SampleEmailTemplateHelpers = {
  enumerate(arr, limit, oxfordComma) {
    if (arr) {
      if (limit instanceof Spacebars.kw) {
        const options = limit;
        limit = options.hash.limit;
        oxfordComma = options.hash.oxfordComma;
      }

      oxfordComma = oxfordComma === undefined ? true : oxfordComma;
      limit = limit === undefined ? -1 : limit;

      if (arr.length === 1 || limit === 1) {
        return arr[0];
      }

      if (limit !== -1) {
        arr = arr.slice(0, limit);
      }

      const length = arr.length;
      const last = arr.pop();
      let suffix = ' and ';

      if (oxfordComma === true
        || typeof oxfordComma === 'number' && length >= oxfordComma) {
        suffix = `, ${suffix}`;
      }

      return arr.join(', ') + suffix + last;
    }

    return '';
  }
};
*/
