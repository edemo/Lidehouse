import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
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
      if (this.contractSelected()) {
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
    function enforceWholeYear() {
      const beginDate = moment(this.beginDate());
      const wholeBeginDate = moment(this.beginDate()).startOf('year');
      if (!beginDate.isSame(wholeBeginDate)) {
        this.beginDate(wholeBeginDate.format('YYYY-MM-DD'));
      }
    },
  ],
  communityId() {
    return ModalStack.getVar('communityId');
  },
  contractSelected() {
    const parcelId = this.parcelSelected();
    if (!parcelId) return undefined;
    const parcel = Parcels.findOne(parcelId);
//    const result = parcel?.payerPartner()?._id;
    const result = parcel?.payerContract()?._id;
    return result;
  },
  subscribeParams() {
    return {
      communityId: this.communityId(),
//      partnerId: this.partnerSelected() || null,
      contractId: this.contractSelected() || null,
      begin: new Date(this.beginDate()),
      end: new Date(this.endDate()),
    };
  },
  beginBalanceDef() {
    const contract = Contracts.findOne(this.contractSelected());
    return {
      communityId: this.communityId(),
      partner: contract?.partnerContractCode(),
    };
  },
  history() {
    const result = {};
    result.beginBalance = Balances.getCumulatedValue(this.beginBalanceDef(), this.beginDate());
    const selector = Transactions.makeFilterSelector(this.subscribeParams());
    const txs = Transactions.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const txsWithRunningTotal = txs.map(tx => {
      const contractAmount = tx.getContractAmount(this.contractSelected());
      total += contractAmount;
      return _.extend(tx, { contractAmount, total });
    });
    result.transactions = txsWithRunningTotal.reverse();
    return result;
  },
});

Template.Parcel_history.events({
//  'click .transactions .js-view'(event, instance) {
//    const id = $(event.target).closest('[data-id]').data('id');
//    const doc = Transactions.findOne(id);
//    Transactions.actions.view({}, doc).run();
//  },
});
