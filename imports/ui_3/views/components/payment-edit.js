import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal-guard.js';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import '/imports/api/transactions/actions.js';
import './payment-edit.html';

Template.Payment_edit.viewmodel({
  partnerRelation() {
    return ModalStack.getVar('txdef').data.relation;
  },
  allocatedAmount() {
    let allocated = 0;
    (AutoForm.getFieldValue('bills') || []).forEach(bp => {
      if (!bp) return;
      allocated += bp.amount;
    });
    return allocated;
  },
  unallocatedAmount() {
    return AutoForm.getFieldValue('amount') - this.allocatedAmount();
  },
});

Template.Payment_edit.events({
  'click .js-new'(event, instance) {
    const paymentDef = ModalStack.getVar('txdef');
    const billDef = Txdefs.findOne({ communityId: paymentDef.communityId, category: 'bill', 'data.relation': paymentDef.data.relation });
    const doc = {
      relation: AutoForm.getFieldValue('relation'),
      partnerId: AutoForm.getFieldValue('partnerId'),
    };
    Transactions.actions.new({ entity: 'bill', txdef: billDef }, doc).run(event, instance);
  },
});
