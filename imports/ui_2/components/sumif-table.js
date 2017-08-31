import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Payments } from '/imports/api/payments/payments.js';
import { __ } from '/imports/localization/i18n.js';
import { _ } from 'meteor/underscore';

import './sumif-table.html';

function descartesProductWith(vectorArray, elemArray) {
  const result = [];
  vectorArray.forEach((vector) => {
    elemArray.forEach((elem) => {
      result.push(vector.concat(elem));
    });
  });
  return result;
}

export function descartesProduct(arrayOfArrays) {
  let result = [[]];
  arrayOfArrays.forEach((array) => {
    result = descartesProductWith(result, array);
  });
  return result;
}

function testDescartes() {
  const array1 = ['1', '2'];
  const array2 = ['x'];
  const array3 = ['a', 'b', 'c'];
  const descartes = descartesProduct([array1, array2, array3]);
  const result = [['1', 'x', 'a'], ['1', 'x', 'b'], ['1', 'x', 'c'],
                  ['2', 'x', 'a'], ['2', 'x', 'b'], ['2', 'x', 'c']];
}

testDescartes();

Template.Sumif_table.onCreated(function financesOnCreated() {
});

Template.Sumif_table.helpers({
  timestamp() {
    return moment().format('YYYY.MM.DD');
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
    return descartesProduct(rows.map(row => (row.total ? ['total'] : []).concat(row.values)));
  },
  displayHeaderCell(vector, index, dim) {
    let display = vector[index];
    let classValue = 'header';
    const rowDef = this[dim][index];
    if (display === 'total') {
      display = rowDef.total;
      classValue += ' total';
    } else {
      switch (rowDef.field.split('.')[0]) {
        case 'month': display += `. ${__('month')}`; break;
        case 'accounts': display = PayAccounts.leafDisplay(display); break;
        default: display = __(display);
      }
    }
    return `<td class="${classValue}">${display}</td>`;
  },
  displaySumifCell(rowVector, colVector) {
    let amount = 0;
    let classValue = '';
    const query = _.extend({}, this.filter);
    rowVector.forEach((elem, index) => {
      if (elem === 'total') {
        classValue += ' total';
        return;
      }
      const rowKey = this.rows[index].field;
      query[rowKey] = elem;
    });
    colVector.forEach((elem, index) => {
      if (elem === 'total') {
        classValue += ' total';
        return;
      }
      const colKey = this.cols[index].field;
      query[colKey] = elem;
    });
    const payments = Payments.find(query);
    payments.forEach(pay => amount += pay.amount);
    return `<td class="${classValue}">${amount}</td>`;
  },
});
