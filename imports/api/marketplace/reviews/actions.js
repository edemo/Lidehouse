import { Deals } from '/imports/api/marketplace/deals/deals.js';
import { Reviews } from '/imports/api/marketplace/reviews/reviews.js';

//-----------------------------------------------

AutoForm.addModalHooks('af.review.create');
AutoForm.addHooks('af.review.create', {
  formToDoc(doc) {
    const deal = Deals.findOne(doc.dealId);
    doc.listingId = deal.listingId;
    return doc;
  },
});
