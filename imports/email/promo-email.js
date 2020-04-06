import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';

export const Promo_Email = {
  path: 'email/promo-email.html',    // Relative to the 'private' dir.

  layoutData: {
    type: 'Promo',
    footer: 'PromoFooter',
    alert: 'good',
  },

  helpers: {
    content(emailParams, paragraph) {
      const text = 'email.PromoContent.' + emailParams.promoCode + '.' + paragraph;
      return TAPi18n.__(text, emailParams, this.user.settings.language);
    },
  },

  route: {
    path: '/promo-email/:uid/:cid',
    data: (params) => {
      const user = Meteor.users.findOne(params.uid);
      const community = Communities.findOne(params.cid);
      const communityId = params.cid;
      const communityName = community.name;
      const loginEmail = user.getPrimaryEmail();
      return {
        user,
        emailParams: {
          communityName,
          promoCode: 'covid',
          loginLink: 'https://demo.honline.hu/signin',
          loginEmail,
          password: "n.a.",
          inviteMembersLink: `https://demo.honline.hu/demo?lang=hu&promo=${communityId}`,
        },
        ...Promo_Email.layoutData,
      };
    },
  },
};
