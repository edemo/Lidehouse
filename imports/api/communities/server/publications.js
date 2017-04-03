/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

import { Communities } from '../communities.js';

Meteor.publish('communities.listing', function communitiesListing() {
  return Communities.find({}, {
    fields: Communities.publicFields,
  });
});
