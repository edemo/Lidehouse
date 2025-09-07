import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Listings } from '/imports/api/marketplace/listings/listings.js';

import './listing-show.html';
import { ModalStack } from '../../lib/modal-stack.js';

Template.Listing_show.onCreated(function listingShowOnCreated() {
  this.autorun(() => {
    const listingId = FlowRouter.getParam('_lid');
    const listing = listingId && Listings.findOne(listingId);
    this.subscribe('listings.byId', { _id: listingId });
    if (listing) {
      ModalStack.setVar('communityId', listing.communityId, true);
      ModalStack.setVar('relation', listing.relation, true);
    }
  });
});

Template.Listing_show.helpers({
  listing() {
    const listingId = FlowRouter.getParam('_lid');
    const listing = listingId && Listings.findOne(listingId);
//    console.log("listing", listing)
    return listing;
  },
  pageTitle() {
    return __('listing') + ' ' + __('details');
  },
  smallTitle() {
    return this.title;
  },
  pageCrumbs() {
    return [{
        title: __('Marketplace'),
        url: FlowRouter.path('Marketplace'),
    }];
  },
  mine() {
    return this.creatorId === Meteor.userId();
  },
  redirectToDestination(destinationId) {
    Meteor.setTimeout(function () {
      FlowRouter.go('Listing show', { _lid: destinationId });
    }, 3000);
  },
});
