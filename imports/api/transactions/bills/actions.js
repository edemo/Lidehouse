import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/bill-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Bills } from './bills.js';
import { Payments } from '../payments/payments.js';
import { TxCats } from '../tx-cats/tx-cats.js';
import { Transactions } from '../transactions.js';
import '../methods.js';


//------------------------------------------

AutoForm.addModalHooks('af.bill.insert');
AutoForm.addModalHooks('af.bill.update');

AutoForm.addHooks('af.bill.insert', {
  formToDoc(doc) {
    doc.category = 'bill';
    doc.communityId = Session.get('activeCommunityId');
    doc.relation = Session.get('activePartnerRelation');
    doc.valueDate = doc.deliveryDate;
    doc.lines = _.without(doc.lines, undefined);
    // TODO: should be one call
//    const tdoc = Transactions._transform(doc);
//    tdoc.autofillLines();
//    tdoc.autofillOutstanding();
//    _.extend(doc, tdoc);
    //
    return doc;
  },
});
