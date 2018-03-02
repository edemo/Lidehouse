import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { __ } from '/imports/localization/i18n.js';
import { _ } from 'meteor/underscore';
import { descartesProduct } from '/imports/utils/descartes.js';
import './sumif-table.html';

Template.Sumif_table.onCreated(function financesOnCreated() {
});

Template.Sumif_table.helpers({
  timestamp() {
    return moment().format('L');
  },
  /*
  descartesFields(rows) {
    return descartesProduct(rows.map((row) => {
      const res = [];
      row.values.forEach(v => res.push(row.field));
      return res;
    })
    );
  },*/
  descartesValues(rows) {
    return descartesProduct(rows.map(row => row.values.nodes()));
  },
  displayHeaderCell(vector, index, dim) {
    const elem = vector[index];
    let display;
    let classValue = 'header';
    const rowDef = this[dim][index];
    if (elem.isLeaf === false) {
      display = elem.name.toString();
      if (elem.level === 0) display = __('total');
      if (elem.level <= 1) display = display.toUpperCase();
      if (elem.level <= 2) classValue += ' total';
    } else {
      display = elem.name;
      switch (rowDef.field.split('.')[0]) {
        case 'date': {
          display += `. ${__('month')}`;
          break;
        }
        case 'accounts': {
          const payAccount = PayAccounts.findOne({ name: rowDef.field.split('.')[1] });
          display = payAccount.leafDisplay(display);
          break;
        }
        default: display = __(elem.name);
      }
    }
    return `<td class="${classValue}">${display}</td>`;
  },
  displaySumifCell(rowVector, colVector) {
    let amount = 0;
    let classValue = '';
    const query = _.extend({}, this.filter);

    rowVector.forEach((elem, index) => {
      if (elem.isLeaf === false) {
        classValue += ' total';
      }
      const rowKey = this.rows[index].field;
      query[rowKey] = { $in: _.pluck(elem.leafs(), 'name') };
    });
    colVector.forEach((elem, index) => {
      if (elem.isLeaf === false) {
        classValue += ' total';
      }
      const colKey = this.cols[index].field;
      query[colKey] = { $in: _.pluck(elem.leafs(), 'name') };
    });

    const payments = Payments.find(query);
    payments.forEach(pay => amount += pay.amount);
    
    rowVector.forEach((elem, index) => {
      if (elem.isLeaf === false) {
        if (amount < 0) classValue += ' negative';
      }
    });
    colVector.forEach((elem, index) => {
      if (elem.isLeaf === false) {
        if (amount < 0) classValue += ' negative';
      }
    });

    return `<td class="${classValue}">${amount}</td>`;
  },
});
