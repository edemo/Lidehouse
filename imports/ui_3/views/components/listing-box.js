import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import '../blocks/chopped.js';
import './listing-box.html';

Template.Listing_box.viewmodel({
  showInterestedDeals: false,

  onCreated(instance) {
  },
});

Template.Listing_box.events({
  'click .js-show-active-deals'(event, instance) {
    instance.viewmodel.showInterestedDeals(true);
  },
});
