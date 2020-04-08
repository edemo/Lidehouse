import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';

import { displayError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Communities } from '/imports/api/communities/communities.js';
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
        callToAction: 'Létrehozom a társasházamat!',
        details3: 'Költözzön be és hívja meg lakótársait!',
      };
    } else { // The promo code is s communityId thtat invites the user
      return {
        header: 'Elkészült a saját háza',
        callToAction: 'Nézze meg',
        details: 'a saját házát, és szavazzon benne!',
      };
    }
  },
});

const schemaQuickCommunityLaunch = new SimpleSchema({
  admin: { type: Object },
  'admin.email': SimpleSchema.Types.Email,
  community: { type: Object },
  'community.name': { type: String, max: 100 },
  parcelCount: { type: Number, max: 1000, optional: true, defaultValue: 100 },
  promoCode: { type: String, autoform: { type: 'hidden' } },
});

Meteor.startup(function attach() {
  schemaQuickCommunityLaunch.i18n('promo');
});

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
        title: instance.viewmodel.message().header,
        schema: schemaQuickCommunityLaunch,
        doc: {
          parcelCount: 100,
        },
        type: 'normal',
        size: 'md',
        btnOK: 'Ház elkészítése',
        btnClose: 'Maybe later',
      });
    } else { // The promo code is a communityId into which the user was invited
      const community = Communities.findOne(promoCode);
      if (!community) return;
      Modal.show('Modal', {
        id: 'join-community',
        title: instance.viewmodel.message().header,
        text: __('promo.InstructionsToJoin'),
        btnOK: 'Belépés a saját házba',
        onOK() {
          Session.set('promo');
          Meteor.logout(onSuccess(() => {
            Session.set('activeCommunityId', promoCode);
            AccountsTemplates.forceLogin(
              Communities.actions.join({}, community).run,
              'signup'
            );
          }));
        },
        btnClose: 'Maybe later',
      });
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
    doc.community = _.extend({}, doc.community, {
      status: 'sandbox',
      totalunits: 100 * doc.parcelCount,  // new joiners will get 100 voting units
      city: '?-város',
      street: '?-utca',
      number: '?-szám',
      zip: '1111',
      lot: '?-hrsz',
      settings: {
        language: 'hu',
      },
    });
    doc.admin = _.extend({}, doc.admin, {
      language: 'hu',
    });
    Meteor.call('communities.launch', doc,
      onSuccess((res) => {
        Modal.hide(this.template.parent());
        Session.set('promo'); // turn it off
        Meteor.setTimeout(() => {
          Modal.show('Modal', {
            title: 'GRATULÁLUNK',
            text: `Az ön háza elkészült! (azonosítója:${res}) <br><br>
              A megadott email címre elküldtük a linket, amivel a meghívottak csatlakozhatnak. <br>
              Ossza meg a linket lakótársaival.`,
            btnOK: 'OK',
          });
        }, 1000);
      })
    );
    return false; // otherwise calls AJAX
  },
});

AutoForm.addModalHooks('af.community.join');
