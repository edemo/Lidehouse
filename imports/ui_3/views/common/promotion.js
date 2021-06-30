/* globals window, fbq */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';
import { $ } from 'meteor/jquery';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import '/imports/api/communities/actions.js';

import './promotion.html';

Template.Promotion.viewmodel({
  fullShow: true,
  autorun() {
    this.templateInstance.subscribe('communities.byId', { _id: Session.get('promo') });
  },
  show() {
    const promo = Session.get('promo');
    return !!promo;
  },
  fullShowClass() {
    return this.fullShow() && 'show';
  },
  icon() {
    return this.fullShow() ? 'fa-times' : 'fa-info-circle';
  },
  message() {
    const promo = Session.get('promo');
    if (!promo) return undefined;
    if (promo === 'covid') {
      return {
        header: 'Tetszik, amit lát?',
        details1: 'Építse fel saját házát a HONLINE rendszerében!',
        details2: 'Egy kattintás és már kész is!',
        callToAction: 'Létrehozom a társasházamat',
        details3: 'Költözzön be és hívja meg lakótársait!',
      };
    } else { // The promo code is s communityId thtat invites the user
      return {
        header: 'Az Ön társasházát',
        details1: 'egy lakótársa már létrehozta a honline',
        details2: 'rendszerében, sőt egy szavazást is kiírt!',
        callToAction: 'Belépek a saját házunkba',
        details3: 'Lépjen be a házba és vegye birtokba lakását!',
      };
    }
  },
});

const schemaQuickCommunityLaunch = new SimpleSchema({
  admin: { type: Object },
  'admin.email': SimpleSchema.Types.Email(),
  community: { type: Object },
  'community.name': { type: String, max: 100 },
  parcelCount: { type: Number, max: 1000, optional: true, defaultValue: 100 },
  promoCode: { type: String, autoform: { type: 'hidden' } },
});

schemaQuickCommunityLaunch.i18n('promo');

Template.Promotion.events({
  'click .promotion-config-box'(event, instance) {
    instance.viewmodel.fullShow(!instance.viewmodel.fullShow());
  },
  'click .call-to-action'(event, instance) {
    const promoCode = Session.get('promo');
    if (!promoCode) return;
    if (promoCode === 'covid') {
      Modal.show('Autoform_modal', {
        body: 'Quick_community_launch',
        id: 'af.community.launch',
        title: __('promo.OneClickToLaunch'),
        schema: schemaQuickCommunityLaunch,
        doc: {
          parcelCount: 100,
        },
        type: 'normal',
        size: 'md',
        btnOK: 'Ház elkészítése',
        btnClose: '-',
      });
      if (fbq) fbq('track', 'AddToCart');
    } else { // The promo code is a communityId into which the user was invited
      window.open(`https://honline.hu/community/${promoCode}/join?demouser=out`, '_blank');
    }
  },
});


AutoForm.addHooks('af.community.launch', {
  formToDoc(doc) {
    doc.promoCode = Session.get('promo');
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.community.launch');
    doc.community.settings = { language: 'hu' };
    Meteor.call('communities.launchMail', doc,
      onSuccess((res) => {
        Modal.hide(this.template.parent());
        Session.set('promo'); // turn it off
        Meteor.setTimeout(() => {
          Modal.show('Modal', {
            title: 'GRATULÁLUNK',
            text: `Az ön háza elkészült!<br><br>
              A házhoz tartozó aktiváló linket és a beköltözéshez szükséges információkat elküldtük a megadott e-mail címre.<br>
              Ha nem találja levelünket a bejövő email-ek között, nézze meg a Promóciók mappában.`,
            btnOK: 'OK',
          });
          if (fbq) fbq('track', 'CompleteRegistration');
        }, 1000);
      })
    );
    return false; // otherwise calls AJAX
  },
});

AutoForm.addModalHooks('af.community.join');
