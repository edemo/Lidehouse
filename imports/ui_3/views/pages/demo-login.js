import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { displayError } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/common/promotion.js';
import './demo-login.html';

const PROMO_DELAY = 15000;

function promoFloatIn(promo) {
  Session.set('promo', promo);
}

Template.Demo_login.onRendered(function onRendered() {
  const lang = FlowRouter.getQueryParam('lang') || 'hu';
  const promo = FlowRouter.getQueryParam('promo');
  Meteor.apply('createDemoUserWithParcel', [lang], { noRetry: false }, function (error, result) {
    if (error) displayError(error);
    else {
      Meteor.loginWithPassword(result, 'password', function (error) {
        if (error) displayError(error);
        else {
          FlowRouter.go('App home');
          if (promo) Meteor.setTimeout(() => promoFloatIn(promo), PROMO_DELAY);
        }
      });
    }
  });
});
