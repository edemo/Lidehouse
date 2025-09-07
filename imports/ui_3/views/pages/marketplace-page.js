import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Relations } from '/imports/api/core/relations.js';
import { Buckets } from '/imports/api/marketplace/buckets/buckets.js';
import '/imports/api/marketplace/buckets/actions.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import '/imports/api/marketplace/listings/actions.js';
import { actionHandlers, ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import './marketplace-page.html';

const listingShows = { 'browse': { icon: 'shopping-cart' }, 'favorites': { icon: 'heart-o' }, 'my listings' : { icon: 'user-circle' }};
const displayModes = { 'grid': { icon: 'th' }, 'list' : { icon: 'bars' }};

Template.Marketplace_page.viewmodel({
  activeRelation: 'supplier',
  activeListingShow: 'browse',
  activeDisplayMode: 'grid',
  bucketSelected: '',
  bucketOptions: [],
  searchText: '',
  activeLocation: '',
  maxPrice: '',

  onCreated(instance) {
    ModalStack.setVar('relation', this.activeRelation(), true);
    instance.autorun(() => {
      const communityId = getActiveCommunityId();
      this.bucketOptions(Buckets.nodeOptionsOf(communityId, ''));
      instance.subscribe('buckets.inCommunity', { communityId });
      instance.subscribe('listings.inCommunity', { communityId });
      instance.subscribe('deals.inCommunity', { communityId });
      instance.subscribe('reviews.inCommunity', { communityId });
    });
  },
  objectKeys(obj) {
    return Object.keys(obj);
  },
  objectValue(obj, key) {
    return obj[key];
  },
  displayModes() {
    return displayModes;
  },
  relationValues() {
    return Relations.mainValues;
  },
  listingShows() {
    return listingShows;
  },
  activeDisplayModeClass(name) {
    return (this.activeDisplayMode() === name) && 'btn-primary active';
  },  
  activeRelationClass(relation) {
    return (this.activeRelation() === relation) && 'btn-primary active';
  },  
  activeListingShowClass(show) {
    return (this.activeListingShow() === show) && 'btn-primary active';
  },  
  listings() {
    const communityId = getActiveCommunityId();
    const selector = { communityId };
    selector.relation = this.activeRelation();
    selector.bucket = new RegExp('^' + this.bucketSelected());
//    if (this.activeLocation()) selector.location = this.activeLocation(); - Server side Location filtering OFF
    if (this.maxPrice()) selector.price = { $lte: Number(this.maxPrice()) };
    const show = this.activeListingShow();
    if (show === 'my listings') selector.creatorId = Meteor.userId();
    else selector.creatorId = { $ne: Meteor.userId() };
//    if (show === 'favorites') TODO
    let listings = Listings.find(selector).fetch();
    if (this.searchText()) {
      listings = listings.filter(t =>
        t.title.toLowerCase().search(this.searchText().toLowerCase()) >= 0
        || t.text.toLowerCase().search(this.searchText().toLowerCase()) >= 0
      );
    }
    if (this.activeLocation()) { // Search style location filtering allows "Budapest, VII." location to be found both as "Budapest" and "VII"
      listings = listings.filter(t =>
        t.location?.toLowerCase().search(this.activeLocation().toLowerCase()) >= 0
      );
    }
//  listings.sort((a, b) => a.title.localeCompare(b.title, community.settings.language, { sensitivity: 'accent' }));
// console.log("selector:", selector);
// console.log("listings:", listings);
    return listings;
  },
});

Template.Marketplace_page.events({
  ...(actionHandlers(Listings,'create')),
  'click .js-display-filter'(event, instance) {
    const name = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activeDisplayMode(name);
  },
  'click .js-relation-filter'(event, instance) {
    const relation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activeRelation(relation);
    ModalStack.setVar('relation', relation, true);
  },
  'click .js-show-filter'(event, instance) {
    const show = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activeListingShow(show);
  },
});
