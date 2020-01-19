import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Partners } from '../api/partners/partners';

export const Outstandings_Email = {
  path: 'email/outstandings-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
  },

  route: {
    path: '/outstandings-email/:pid',
    data: (params) => {
      const partner = Partners.findOne(params.pid);
      return {
        type: 'Outstandings',
        user: partner.user(),
        community: partner.community(),
        partner,
        link: FlowRouterHelpers.urlFor('Parcels finances'),
        alertColor: 'alert-warning',
      };
    },
  },
};
