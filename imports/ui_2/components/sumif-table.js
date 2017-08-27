import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { Payments } from '/imports/api/payments/payments.js';
import { _ } from 'meteor/underscore';

import './sumif-table.html';

Template.Sumif_table.onCreated(function financesOnCreated() {
});

Template.Sumif_table.helpers({
  timestamp() {
    return moment().format('YYYY.MM.DD');
  },
  rowElems() {
    return this.rows[0].values;
  },
  rowElems2() {
    return this.rows[1].values;
  },
  colElems() {
    return this.cols[0].values;
  },
  colElems2() {
    return this.cols[1].values;
  },
  sumif(rowElem, rowElem2, colElem, colElem2) {
    let amount = 0;
    const query = this.filter || {};
    const rowKey = this.rows[0].field;
    const rowKey2 = this.rows[1].field;
    const colKey = this.cols[0].field;
    const colKey2 = this.cols[1].field;
    query[rowKey] = rowElem;
    query[rowKey2] = rowElem2;
    query[colKey] = colElem;
    query[colKey2] = colElem2;
    const payments = Payments.find(query);
    payments.forEach(pay => amount += pay.amount);
    return amount;
  },
});
