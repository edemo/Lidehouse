import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { Transactions } from '../transactions.js';

//--------------------------------------------------

AutoForm.addModalHooks('af.payment.view');
AutoForm.addModalHooks('af.payment.insert');
AutoForm.addModalHooks('af.payment.update');

AutoForm.addHooks('af.payment.insert', {
  formToDoc(doc) {
    doc.category = 'payment';
    doc.communityId = Session.get('activeCommunityId');
    const billId = Session.get('modalContext').billId;
    if (billId) {
      const bill = Transactions.findOne(billId);
      doc.relation = bill.relation;
      doc.partnerId = bill.partnerId;
      doc.billId = billId;
    } else {
      doc.relation = Session.get('activePartnerRelation');
    }
    return doc;
  },
});
