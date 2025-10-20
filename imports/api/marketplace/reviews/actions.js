import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Reviews } from '/imports/api/marketplace/reviews/reviews.js';

Reviews.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-star',
    color: 'warning',
    visible: false,
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.review.create',
        description: 'reviewInstructions.' + doc.relation,
        collection: Reviews,
        doc,
        type: 'method',
        meteormethod: 'reviews.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('reviews.inCommunity', doc) && doc.text,
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.review.view',
        collection: Reviews,
//        schema: callOrRead.call(this, entity.schema),
        doc,
        type: 'readonly',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.review.create');
AutoForm.addHooks('af.review.create', {
  formToDoc(doc) {
    const deal = Deals.findOne(doc.dealId);
    doc.listingId = deal.listingId;
    return doc;
  },
});
