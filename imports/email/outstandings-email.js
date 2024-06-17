import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';

export const Outstandings_Email = {
  path: 'email/outstandings-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  layoutData: contract => ({
    type: 'Outstandings',
    alert: EmailTemplateHelpers.goodOrBad(contract.mostOverdueDaysColor()),
  }),

  helpers: {
  },

  route: {
    path: '/outstandings-email/:pcid',
    data: (params) => {
      const contract = Contracts.findOne(params.pcid);
      return {
        community: contract.community(),
        contract,
        ...Outstandings_Email.layoutData(contract),
      };
    },
  },
};
