import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
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
        header: 'Mutassa meg lakótársainak',
        callToAction: 'Küldjön meghívást',
        details: 'lakótársainak egy saját demo házba!',
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
  voting: { type: Object },
  'voting.title': { type: String, max: 100 },
  'voting.text': { type: String, max: 5000, autoform: { rows: 5 } },
});

Meteor.startup(function attach() {
  schemaQuickCommunityLaunch.i18n('promo');
});

Template.Promotion.events({
  'click .theme-config-box'(event, instance) {
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
          voting: {
            title: 'Teszt szavazás',
            text: 'Valaki majd kitalálja mi lesz a teszt szavazás szövege, és az lesz itt.',
          },
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
    doc.voting = _.extend({}, doc.voting, {
      category: 'vote',
      status: 'opened',
      createdAt: moment().toDate(),
      closesAt: moment().add(2, 'weeks').toDate(),
      vote: {
        procedure: 'online',
        effect: 'poll',
        type: 'yesno',
      },
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
