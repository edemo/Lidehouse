import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { Payments } from '/imports/api/payments/payments.js';
import { _ } from 'meteor/underscore';

import './sumif-table.html';

export function descartesProductWith(vectorArray, elemArray) {
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
  elemOfArray(array, index) {
    return array[index];
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
  sumif(rowVector, colVector) {
    let amount = 0;
    const query = _.extend({}, this.filter);
    rowVector.forEach((elem, index) => {
      if (elem === 'total') return;
      const rowKey = this.rows[index].field;
      query[rowKey] = elem;
    });
    colVector.forEach((elem, index) => {
      if (elem === 'total') return;
      const colKey = this.cols[index].field;
      query[colKey] = elem;
    });
    const payments = Payments.find(query);
    payments.forEach(pay => amount += pay.amount);
    return amount;
  },
});
