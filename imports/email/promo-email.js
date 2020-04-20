import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';

export const Promo_Launch_Link = {
  path: 'email/promo-launch-link.html',    // Relative to the 'private' dir.

  layoutData: {
    type: 'Promo',
    footer: 'PromoFooter',
    alert: 'good',
  },

  helpers: {
    launchLink() {
      const link = `https://honline.hu/launch?lang=${this.community.settings.language}&promo=${this.promoCode}&email=${this.admin.email}&name=${this.community.name}&count=${this.parcelCount}`;
      return link;
    },
  },

  route: {
    path: '/promo-launch-link',
    data: (params) => {
      return {
        admin: { email: 'belaba@demo.com' },
        community: { name: 'Kankalin u 8', settings: { language: 'hu' } },
        parcelCount: 100,
        promoCode: 'covid',
        ...Promo_Launch_Link.layoutData,
      };
    },
  },
};

//------------------------------------------------------------------------------

export const Promo_Invite_Link = {
  path: 'email/promo-invite-link.html',    // Relative to the 'private' dir.

  layoutData: {
    type: 'Promo',
    footer: 'PromoFooter',
    alert: 'good',
  },

  helpers: {
    inviteLink() {
      const link = `https://demo.honline.hu/demo?lang=hu&promo=${this.community._id}`;
      return link;
    },
  },

  route: {
    path: '/promo-invite-link/:cid',
    data: (params) => {
      const community = Communities.findOne(params.cid);
      return {
        community,
        ...Promo_Invite_Link.layoutData,
      };
    },
  },
};
