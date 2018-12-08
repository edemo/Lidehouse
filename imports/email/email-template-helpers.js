import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';

// Global helpers for all email templates
// TODO: duplicates from the clients side - maybe we should try reference in the client helpers here?
export const EmailTemplateHelpers = {
  displayTime(time) {
    return moment(time).format('L LT');
  },
  _(text) {
    return TAPi18n.__(text, {}, 'hu');
  },
  pathFor(params, hash = {}) {
    const result = FlowRouterHelpers.pathFor(params, hash);
    return result;
  },
  urlFor(category) {
    const url = {
      //feedback: '', 
      forum: 'http://tmsbk.hu/HonIcons/font-awesome_4-7-0_commenting_100_0_2d4050_none.png',
      ticket: 'http://tmsbk.hu/HonIcons/font-awesome_4-7-0_wrench_100_0_2d4050_none.png',
      room: 'http://tmsbk.hu/HonIcons/font-awesome_4-7-0_envelope_100_0_2d4050_none.png',
      vote: 'http://tmsbk.hu/HonIcons/font-awesome_4-7-0_gavel_100_0_2d4050_none.png',
      news: 'http://tmsbk.hu/HonIcons/font-awesome_4-7-0_exclamation-circle_100_0_2d4050_none.png',
    };
    return url[category];
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
