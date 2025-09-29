/* globals window */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';

import './community-launch.html';

//  Template exists just to have shareable link to perform this action
Template.Community_launch.onCreated(function onCreated() {
});

Template.Community_launch.onRendered(function onRendered() {
  Meteor.call('communities.launch', {
    admin: {
      email: FlowRouter.getQueryParam('email'),
    },
    community: {
      name: FlowRouter.getQueryParam('name'),
      city: '?-város',
      street: '?-utca',
      number: '?-szám',
      zip: '1111',
      lot: '?-hrsz',
      status: 'sandbox',
      settings: {
        language: FlowRouter.getQueryParam('lang'),
        joinable: 'withLink',
        ownershipScheme: 'condominium',
        totalUnits: 100 * FlowRouter.getQueryParam('count'),  // new joiners will get 100 voting units
        accountingMethod: 'cash',
      },
    },
    parcelCount: FlowRouter.getQueryParam('count'),
    promoCode: FlowRouter.getQueryParam('promo'),
  }, onSuccess(url => window.location.replace(url))
  );
});
