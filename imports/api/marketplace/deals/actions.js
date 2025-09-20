import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import { __ } from '/imports/localization/i18n.js';
import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Reviews } from '/imports/api/marketplace/reviews/reviews.js';
import '/imports/api/marketplace/reviews/actions.js';
import { Deals } from './deals.js';
import './methods.js';

Deals.actions = {
  /*create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    label: __('new') + ' ' + __('deal'),
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('deals.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.deal.create',
        collection: Deals,
        doc,
        type: 'method',
        meteormethod: 'deals.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('deals.upsert', doc),
    run: () => importCollectionFromFile(Deals),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('deals.inCommunity', doc),
    href: FlowRouter.path('Deal show', { _lid: doc._id }),
    run() {
      FlowRouter.go('Deal show', { _lid: doc._id });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('deals.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.deal.edit',
        collection: Deals,
        doc,
        type: 'method-update',
        meteormethod: 'deals.update',
        singleMethodArgument: true,
      });
    },
  }),
  like: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'like',
    label: 'kedvencek közé',
    icon: 'fa fa-heart',
    visible: doc.creatorId !== user._id && user.hasPermission('like.toggle', doc),
    run() {
      // Topics.methods.like.call({ id: doc._id }, handleError);
    },
  }),
  inquireDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'inquireDeal',
    icon: 'fa fa-envelope',
    visible: user.hasPermission('deals.inCommunity', doc),
    run() {
      const communityId = getActiveCommunityId();
      const dealId = Deals.methods.initiate.call({ communityId, listingId: doc._id, partner2Status: 'interested' }, 
        onSuccess(res => FlowRouter.go('Room show', { _rid: res }))
      );
    },
  }),
  requestDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'requestDeal',
    icon: 'fa fa-handshake-o',
    color: 'primary',
    visible: user.hasPermission('deals.inCommunity', doc),
    run() {
      const communityId = getActiveCommunityId();
      Modal.confirmAndCall(Deals.methods.initiate, { communityId, listingId: doc._id, partner2Status: 'confirmed' }, {
        action: 'requestDeal',
        entity: 'deal',
        message: 'You are obligated to go through with the deal',
      });
    },
  }),*/
  confirmDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'confirmDeal',
    icon: 'fa fa-check',
    color: 'primary',
    visible() {
      if (!doc?.listingId) return false;
      const partnerId = user.partnerId(doc.communityId);
      if (partnerId === doc.partner1Id && doc.partner1Status === 'interested') return true;
      if (partnerId === doc.partner2Id && doc.partner2Status === 'interested') return true;
      return false;
    },
    run() {
      Modal.confirmAndCall(Deals.methods.confirm, { _id: doc._id }, {
        action: 'confirmDeal',
        entity: 'deal',
        message: __('warningConfirmation', doc),
      });
    },
  }),
  cancelDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'cancelDeal',
    icon: 'fa fa-times',
    visible() {
      if (!doc?.listingId) return false;
      const partnerId = user.partnerId(doc.communityId);
      return (partnerId === doc.partner1Id || partnerId === doc.partner2Id) && doc.dealStatus() !== 'confirmed' && doc.dealStatus() !== 'canceled';
    },
    run() {
      Modal.confirmAndCall(Deals.methods.cancel, { _id: doc._id }, {
        action: 'cancelDeal',
        entity: 'deal',
        message: 'You are cancelling the deal',
      });
    },
  }),
  proposeDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'proposeDeal',
    icon: 'fa fa-pencil',
    visible() {
      if (!doc?.listingId) return false;
      const partnerId = user.partnerId(doc.communityId);
      return partnerId === doc.partner1Id && doc.dealStatus() !== 'confirmed' && doc.dealStatus() !== 'canceled';
    },
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.deal.edit',
        description: 'warningProposal',
        collection: Deals,
        fields: ['text', 'price'],
        doc,
        type: 'method-update',
        meteormethod: 'deals.update',
        singleMethodArgument: true,
      });
    },
  }),
  reviewDeal: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'reviewDeal',
    icon: 'fa fa-star',
    color: 'warning',
    visible() {
      if (!doc?.listingId) return false;
      const partnerId = user.partnerId(doc.communityId);
      return ((partnerId === doc.partner1Id && !doc.partner1ReviewId) || (partnerId === doc.partner2Id && !doc.partner2ReviewId)) && doc.dealStatus() === 'confirmed';
    },
    run() {
      const options = {};
      const partnerId = user.partnerId(doc.communityId);
      const otherPartner = doc.otherPartner(user);
      const reviewDoc = {
        communityId: doc.communityId,
        listingId: doc.listingId,
        dealId: doc._id,
        reviewerUserId: user._id,
        revieweeUserId: otherPartner.userId,
        reviewerId: partnerId,
        revieweeId: otherPartner._id,
      };
//    Reviews.actions.create(options, doc).run();
      Modal.show('Autoform_modal', {
        id: 'af.review.create',
        description: "schemaReviews.rating.help",
        collection: Reviews,
        doc: reviewDoc,
        type: 'method',
        meteormethod: 'reviews.insert',
      });
    },
  }),
};

Deals.batchActions = {
    accept: new BatchAction(Deals.actions.confirmDeal, Deals.methods.batch.confirm),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.deal.create');
AutoForm.addModalHooks('af.deal.edit');
AutoForm.addHooks('af.deal.create', {
  formToDoc(doc) {
    // doc.creatorId = Meteor.userId();
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.deal.edit', {
  formToModifier(modifier) {
    //    modifier.$set.approved = true;
    return modifier;
  },
});
