import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal-guard.js';
import { Clock } from '/imports/utils/clock';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import './exchange-edit.html';

Template.Exchange_edit.viewmodel({
//  fromPartnerSelected: '',
//  toPartnerSelected: '',
//  partnerContractOptions: [],
  onCreated() {
  },
//  autorun() {
//    const communityId = this.afDoc().communityId;
//    this.partnerContractOptions(Contracts.partnerContractOptions({ communityId }));
//  },
  afDoc(formId) {
    const doc = Transactions._transform(AutoForm.getDoc(formId));
    return doc;
  },
  docField(name) {
    const doc = this.afDoc();
    return doc && Object.getByString(doc, name);
  },
  defaultDate() {
    return Clock.currentTime();
  },
});
