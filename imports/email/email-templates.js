import { Notifications_Email, Immediate_Notifications_Email } from './notifications-email.js';
import { Vote_closes_Email } from './vote-closes-email.js';
import { Bill_Email } from './bill-email.js';
import { Outstandings_Email } from './outstandings-email.js';
import { Promo_Launch_Link, Promo_Invite_Link } from './promo-email.js';

export const EmailTemplates = {
  Notifications_Email, Immediate_Notifications_Email, Vote_closes_Email, Bill_Email, Outstandings_Email, Promo_Launch_Link, Promo_Invite_Link,
};

// -------------- Sample -------------------
/*
export const SampleEmailTemplates = {
  sample: {
    path: 'sample-email/template.html',    // Relative to the 'private' dir.
    scss: 'sample-email/style.scss',       // Mail specific SCSS.

    helpers: {
      capitalizedName() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
      },
    },

    route: {
      path: '/sample/:name',
      data: params => ({
        name: params.name,
        names: ['Johan', 'John', 'Paul', 'Ringo'],
      }),
    },
  },
};
*/
