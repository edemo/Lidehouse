import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { numeral } from 'meteor/numeral:numeral';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { __ } from '/imports/localization/i18n.js';

// Global helpers for all email templates
// TODO: duplicates from the clients side - maybe we should try reference in the client helpers here?
export const EmailTemplateHelpers = {
  equals(a, b) {
    return a == b;
  },
  or(a, b) {
    return a || b;
  },
  displayTime(time) {
    return moment(time).format('L LT');
  },
  _(text, kw) {
    const lang = this.user ? this.user.settings.language : this.community.settings.language;
    return TAPi18n.__(text, kw.hash, lang);
  },
  displayValue(val) {
    const lang = this.user ? this.user.settings.language : this.community.settings.language;
    if (_.isDate(val)) return moment(val).format('L');
    if (_.isString(val)) return TAPi18n.__(val, {}, lang);
    return val;
  },
  subject(type, user, community) {
    const lang = user ? user.settings.language : community.settings.language;
    return TAPi18n.__('email.' + type, {}, lang) + ' ' + TAPi18n.__('email.fromTheCommunity', { name: community.name }, lang);
  },
  goodOrBad(color) {
    switch (color) {
      case 'info': return 'good';
      case 'warning': return 'warning';
      case 'danger': return 'bad';
      default: debugAssert(false); return undefined;
    }
  },
  urlFor(route, hash = {}) {
    let result;
    if (route.charAt(0) === '/') {
      result = FlowRouterHelpers.urlFor(route, hash);
    } else { result = route; }
    return result;
  },
  topicUrlFor(topic) {
    if (topic.category === 'room') {
      return FlowRouterHelpers.urlFor('Room show', { _rid: topic._id });
    }
    return FlowRouterHelpers.urlFor('Topic show', { _tid: topic._id });
  },
  curb(text, chars) {
    const lang = this.user ? this.user.settings.language : this.community.settings.language;
    if (text.length < chars) return text;
    return text.substr(0, chars) + `... [${TAPi18n.__('see full text with View button', {}, lang)}]`;
  },
  displayPercent(number) {
    return numeral(number).format('0.00') + '%';
  },
  concat() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
  },
  entriesOf(obj) {
    return Object.entries(obj);
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
