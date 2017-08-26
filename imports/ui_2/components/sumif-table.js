import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { PayAccounts } from '/imports/api/payments/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { remove as removePayment } from '/imports/api/payments/methods.js';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { paymentColumns, payaccountColumns } from '/imports/api/payments/tables.js';
import { reportColumns } from '/imports/api/payments/reports.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import './sumif-table.html';

Template.Sumif_table.onCreated(function financesOnCreated() {
  const communityId = Session.get('activeCommunityId');
  this.data.locator = PayAccounts.findOne({ communityId, name: 'Fizetési hely' });
  this.data.befnem = PayAccounts.findOne({ communityId, name: 'Befizetés nem' });
});

Template.Sumif_table.helpers({
  timestamp() {
    return moment().format('YYYY.MM.DD');
  },
  rowElems() {
    return this.locator.init().leafNames;
  },
  colElems() {
    return this.befnem.init().leafNames;
  },
  colElems2() {
    return ['bill', 'done'];
  },
  sumif(rowElem, colElem, colElem2) {
//    return rowElem + ',' + colElem;
    let amount = 0;
    const query = {};
    const rowKey = 'accounts.' + this.locator.name;
    const colKey = 'accounts.' + this.befnem.name;
    const colKey2 = 'orient';
    query[rowKey] = rowElem;
    query[colKey] = colElem;
    query[colKey2] = colElem2;
    const payments = Payments.find(query);
    payments.forEach(pay => amount += pay.amount);
    return amount;
  },
});
