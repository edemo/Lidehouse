import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { Period } from '/imports/api/transactions/periods/period.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { validDateOrUndefined } from '/imports/api/utils';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/ui_3/views/blocks/help-icon.js';

import './partner-history.html';

Template.Partner_history.viewmodel({
  beginDate: '',
  endDate: '',
  partnerOptions: [],   // should rename to contractOptions
  partnerSelected: '',  // should rename to contractSelected
  contractToView: '',
  status: 'Reconciled',
  onCreated(instance) {
    instance.autorun(() => {
      if (this.partnerSelected()) {
        instance.subscribe('transactions.byPartnerContract', this.subscribeParams());
        instance.subscribe('txdefs.inCommunity', { communityId: this.communityId() });
        instance.subscribe('balances.inCommunity', this.beginBalanceDef());
      }
    });
  },
  autorun: [
    function defaultOptionSelect() {
      const instance = this.templateInstance;
      instance.autorun(() => {
        if (this.partnerOptions().length && !this.partnerSelected()) {
          this.partnerSelected(this.partnerOptions()[0].value);
        }
      });
    },
    function setContractToView() {
      if (this.partnerSelected()) {
        this.contractToView(this.partnerSelected());
      }
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
  subscribeParams() {
    if (!this.contractToView()) return {};
    const contract = Contracts.findOne(this.contractToView());
    return {
      communityId: this.communityId(),
      partnerId: contract?.partnerId || null,
      contractId: contract?._id || null,
      begin: validDateOrUndefined(this.beginDate()),
      end: validDateOrUndefined(this.endDate()),
    };
  },
  beginBalanceDef() {
    if (!this.contractToView()) return {};
    const contract = Contracts.findOne(this.contractToView());
    const year = validDateOrUndefined(this.beginDate())?.getFullYear();
    return {
      communityId: this.communityId(),
      partner: contract?.code() || null,
      tag: `O-${year}`,
    };
  },
  history() {
    if (!this.contractToView()) return {};
    const result = {};
    const contract = Contracts.findOne(this.contractToView());
    result.beginBalance = Balances.get(this.beginBalanceDef()).total() * (-1);
    const selector = Transactions.makeFilterSelector(this.subscribeParams());
    const txs = Transactions.find(selector, { sort: [['valueDate', 'asc'], ['createdAt', 'asc']] });
    let total = result.beginBalance;
    let txsWithRunningTotal = txs.map(tx => {
      const effectiveAmount = tx.getContractAmount(contract) * (-1);
      total += effectiveAmount;
      return _.extend(tx, { effectiveAmount, total });
    });
    if (!Meteor.user().hasPermission('transactions.inCommunity')) {
      txsWithRunningTotal = txsWithRunningTotal.filter(tx => tx.effectiveAmount);
    }
    result.transactions = txsWithRunningTotal.reverse();
    result.predecessor = contract?.predecessor();
    return result;
  },
});

Template.Partner_history.events({
//  'click .transactions .js-view'(event, instance) {
//    const id = $(event.target).closest('[data-id]').data('id');
//    const doc = Transactions.findOne(id);
//    Transactions.actions.view({}, doc).run();
//  },
  'click .js-predecessor'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    instance.viewmodel.contractToView(id);
  },
});
