import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Reviews } from '/imports/api/marketplace/reviews/reviews.js';

Reviews.actions = {
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('reviews.inCommunity', doc) && doc.text,
    run() {
      Modal.show('Autoform_modal', {
        id: `af.review.view`,
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
