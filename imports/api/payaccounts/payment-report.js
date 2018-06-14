import { _ } from 'meteor/underscore';
import { numeral } from 'meteor/numeral:numeral';

import { debugAssert } from '/imports/utils/assert.js';
import { Payments } from '/imports/api/payments/payments.js';

export class PaymentReport {
  constructor() {
    this.filters = {};
    this.rows = [];
    this.cols = [];
  }

  headerLinesCount(dim) {
    const otherDim = (dim === 'rows') ? 'cols' : 'rows';
    let max = 0;
    this[otherDim].forEach(line => max = Math.max(max, line.length));
    return max;
  }

  addFilter(filter) {
    _.extend(this.filters, filter);
  }

  // A lineDef is an array of filters. Each elem in the array is a filter that will show its *value* on the title bar
  addLine(dim, lineDef, asFirst = false) {
    if (asFirst) {
      this[dim].unshift(lineDef);
    } else {
      this[dim].push(lineDef);
    }
  }

  // Adding a whole tree of lines, separately or descarting the current set of lines 
  addTree(dim, treeDef, descartes = true, sumFirst = true, asFirst = false) {
    let nodes = treeDef.values.nodes();
    if (!sumFirst) nodes = nodes.reverse();
    const newLineDefs = nodes.map(node => PaymentReport.nodeToLineDef(treeDef.field, node));
    if (descartes) {
      this.addDescartesProductLines(dim, newLineDefs);
    } else {
      newLineDefs.forEach(lineDef => this.addLine(dim, [lineDef], asFirst));
    }
  }

  static nodeToLineDef(field, node) {
    return {
      field,
      value: node.label || node.name,
      values: _.pluck(node.leafs(), 'name'),
      class: 'header-level' + node.level,
      mongoFilter() {
        let obj = {};
        obj[this.field] = { $in: this.values };
        if (this.field.split('.')[0] === 'account') {
          obj = Payments.accountFilter(obj);
        }
        return obj;
      },
      arrayFilterFunc() {
        return (a => {
          if (this.field.indexOf('.') > 0) {
            const split = this.field.split('.');
            debugAssert(split[0] === 'account');
            return !!a.account && _.contains(this.values, a.account[split[1]]);
          } else {
            return _.contains(this.values, a[field]);
          }
        });
      },
    };
  }

  createTableHeader() {
    const headerRows = [];
    for (let y = 0; y < this.headerLinesCount('rows'); y++) {
      const headerRow = [];
      for (let x = 0; x < this.headerLinesCount('cols'); x++) {
        const emptyCell = { class: '', value: ' ' };
        headerRow.push(emptyCell);
      }
      for (let x = 0; x < this.cols.length; x++) {
        const col = this.cols[x];
        headerRow.push(col[y]);
      }
      headerRows.push(headerRow);
    }
    return headerRows;
  }

  createTableBody() {
    const bodyRows = [];
    for (let y = 0; y < this.rows.length; y++) {
      const bodyRow = [];
      const row = this.rows[y];
      for (let x = 0; x < this.headerLinesCount('cols'); x++) {
        bodyRow.push(row[x]);
      }
      for (let x = 0; x < this.cols.length; x++) {
        const col = this.cols[x];
        bodyRow.push(this.cell(x, y));
      }
      bodyRows.push(bodyRow);
    }
    return bodyRows;
  }

  cell(x, y) {
    const colDefs = this.cols[x];
    const rowDefs = this.rows[y];
    const filter = _.extend({}, this.filters);
    const arrayFilterFuncs = [];

    let classes = 'cell';
    function addFilter(lineDef) {
      filter.$and = filter.$and || [];
      filter.$and.push(lineDef.mongoFilter());
      classes += ' ' + lineDef.class;
      arrayFilterFuncs.push(lineDef.arrayFilterFunc());
    }
    const lineDefs = colDefs.concat(rowDefs);
    lineDefs.forEach(addFilter);

    let totalAmount = 0;
    const payments = Payments.find(filter);
    let signOfImpact = +1;
    payments.forEach(payment => {
//      lineDefs.forEach(lineDef => {
//        const calculatedSign = Payments.signOfImpact(payment, lineDef.field, lineDef.values);
//        if (!calculatedSign) ;
//        else if (!signOfImpact) signOfImpact = calculatedSign;
//        else debugAssert(signOfImpact === calculatedSign); // It is NOT OK to set up a table where the calculated impact sign would be different from the perspective of different effected fields
//      });
      totalAmount += signOfImpact * payment.amount;
    });

    if (totalAmount < -0.001) classes += ' negative';
//    console.log(`${x}, ${y}: filter:`); console.log(filter);
    return { class: classes, value: numeral(totalAmount).format() };
  }

  addDescartesProductLines(dim, newLineDefs) {
    const result = [];
    const currentLines = this[dim];
    currentLines.forEach(line =>
      newLineDefs.forEach(newLineDef =>
        result.push(line.concat([newLineDef]))
      )
    );
    this[dim] = result;
  }
}
