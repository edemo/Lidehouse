import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import './parcel-history.html';

Template.Parcel_history.viewmodel({
  beginDate: '',
  endDate: '',
  parcelOptions: [],
  parcelSelected: '',
  status: 'Reconciled',
  onCreated(instance) {
    ModalStack.setVar('relation', 'member', true);
    instance.autorun(() => {
      if (this.partnerSelected()) {
        instance.subscribe('transactions.byPartner', this.subscribeParams());
        instance.subscribe('txdefs.inCommunity', { communityId: this.communityId() });
      }
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const instance = this.templateInstance;
      instance.autorun(() => {
        if (this.parcelOptions().length && !this.parcelSelected()) {
          this.parcelSelected(this.parcelOptions()[0].value);
        }
      });
    },
  ],
  communityId() {
    return ModalStack.getVar('communityId');
  },
  partnerSelected() {
    const parcelId = this.parcelSelected();
    if (!parcelId) return undefined;
    const parcel = Parcels.findOne(parcelId);
//    const result = parcel?.payerPartner()?._id;
    const result = parcel?.payerContract()?.membershipId;
    return result;
  },
  subscribeParams() {
    return {
      communityId: this.communityId(),
//      partnerId: this.partnerSelected() || null,
      membershipId: this.partnerSelected() || null,
      begin: new Date(this.beginDate()),
      end: new Date(this.endDate()),
    };
  },
  transactions() {
    const selector = Transactions.makeFilterSelector(this.subscribeParams());
    const txs = Transactions.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const txsWithRunningTotal = txs.map(tx => {
      total += tx.subjectiveAmount();
      return _.extend(tx, { total });
    });
    return txsWithRunningTotal.reverse();
  },
  negativeClass(tx) {
    return tx.subjectiveAmount() < 0 ? 'negative' : '';
  },
});

Template.Parcel_history.events({
//  'click .transactions .js-view'(event, instance) {
//    const id = $(event.target).closest('[data-id]').data('id');
//    const doc = Transactions.findOne(id);
//    Transactions.actions.view({}, doc).run();
//  },
});
