import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { descartesProduct } from '/imports/utils/descartes.js';
import { Payments } from '/imports/api/payments/payments.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

class PaymentReport {
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
      values: { $in: _.pluck(node.leafs(), 'name') },
      class: 'header-level' + node.level,
      filter() {
        const obj = {};
        obj[this.field] = this.values;
        return obj;
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
    const col = this.cols[x];
    const row = this.rows[y];
    const filter = _.extend({}, this.filters);

    let classes = '';
    function addFilter(f) {
      _.extend(filter, f.filter());
      classes += ' ' + f.class;
    }
    col.forEach(addFilter);
    row.forEach(addFilter);

    let amount = 0;
    const payments = Payments.find(filter);
    payments.forEach(pay => amount += pay.amount);

    if (amount < 0) classes += ' negative';
//    console.log(`${x}, ${y}: filter:`); console.log(filter);
    return { class: classes, value: amount };
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

//--------------------------------------------------------

export function expandFrom1To3Levels(tree) {
  const leafs = _.clone(tree.children);
//  console.log("Expand", leafs);
  tree.children = [];
  tree.children[0] = {};
  tree.children[0].name = '';
  tree.children[0].children = [];
  tree.children[0].children[0] = {};
  tree.children[0].children[0].name = '';
  tree.children[0].children[0].children = leafs;
//  console.log(tree);
  return tree;
}

export const phaseTags = expandFrom1To3Levels({
  name: 'balance',
  children: [
  { name: 'done' },
  { name: 'bill' },
  ],
});

export const yearTags = expandFrom1To3Levels({
  name: '',
  children: [
  { name: 2016 },
  { name: 2017 },
  ],
});

export const monthTags = expandFrom1To3Levels({
  name: 2017,
  children: [
  { name: 1, label: 'JAN' },
  { name: 2, label: 'FEB' },
  { name: 3, label: 'MAR' },
  { name: 4, label: 'APR' },
  { name: 5, label: 'MAY' },
  { name: 6, label: 'JUN' },
  { name: 7, label: 'JUL' },
  { name: 8, label: 'AUG' },
  { name: 9, label: 'SEP' },
  { name: 10, label: 'OCT' },
  { name: 11, label: 'NOV' },
  { name: 12, label: 'DEC' },
  ],
});

export const TulajdonosiBefizetesek = expandFrom1To3Levels({
  name: 'Tulajdonosi Befizetesek', label: 'Összesen',
  children: [
  { name: 'Közös költség befizetés' },
  { name: 'Felújítási alap befizetés' },
  { name: 'Felújítási célbefizetés' },
//    { name: 'Támogatás' },
  { name: 'Víz díj' },
  { name: 'Fűtési díj' },
//    { name: 'Kamat pénzintézetektől' },
  { name: 'Egyéb közvetített szolgáltatás' },
  ],
});

export const Reports = {
  Egyenlegek() {
    const report = new PaymentReport('Egyenlegek');
    const communityId = Session.get('activeCommunityId');
    report.addFilter({ phase: 'done' });
    report.addLine('cols', [], false);
    report.addTree('rows', {
      field: 'accounts.Pénz számlák',
      values: PayAccounts.findOne({ communityId, name: 'Pénz számlák' }),
    }, false);
    return report;
  },

  PenzugyekReszletei(year) {
    const report = new PaymentReport('Penzugyek Reszletei');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: 'done' });

    report.addTree('cols', {
      field: 'month',
      values: PayAccounts._transform(monthTags),
    }, false);

    const koltsegNemekWoBackoffice = PayAccounts.findOne({ communityId, name: 'Költség nemek' });
    koltsegNemekWoBackoffice.removeSubTree('Back office műveletek');
    koltsegNemekWoBackoffice.name = '';

    report.addTree('rows', {
      field: 'accounts.Költség nemek',
      values: koltsegNemekWoBackoffice,
    }, false);

    const planColDef = {
      value: 'Terv',
      filter() {
        return { year, phase: 'plan' };
      },
    };
    report.addLine('cols', [planColDef], true);

    const prevYearColDef = {
      field: 'year',
      value: year - 1,
      class: 'total',
      filter() {
        return { year: year - 1 };
      },
    };
    report.addLine('cols', [prevYearColDef], true);

    return report;
  },

  AlbetetemElszamolasa(year) {
    const report = new PaymentReport('Albetetek Elszamolasa');
    const communityId = Session.get('activeCommunityId');
    const myParcels = {
      name: 'Albetéteim', label: 'Összes albetét',
      children: [],
    };
    Memberships.find({ communityId, userId: Meteor.userId(), role: 'owner' })
      .map(m => myParcels.children.push({ name: m.parcel().serial.toString() /* + '. ' + __('parcel')*/ }));
    expandFrom1To3Levels(myParcels);

    report.addFilter({ phase: { $in: ['bill', 'done'] } });

    report.addTree('rows', {
      field: 'accounts.Könyvelési helyek',
      values: PayAccounts._transform(myParcels),
    }, false);

    report.addTree('rows', {
      field: 'accounts.Költség nemek',
      values: PayAccounts._transform(TulajdonosiBefizetesek),
    }, true, true);

    report.addTree('cols', {
      field: 'phase',
      values: PayAccounts._transform(phaseTags),
    }, false, false);

    return report;
  },

  AlbetetekElszamolasa(year) {
    const report = new PaymentReport('Albetetek Elszamolasa');
    const communityId = Session.get('activeCommunityId');

    report.addFilter({ phase: { $in: ['bill', 'done'] } });

    report.addTree('rows', {
      field: 'accounts.Könyvelési helyek',
      values: PayAccounts.findOne({ communityId, name: 'Könyvelési helyek' }),
    }, false);

    report.addTree('cols', {
      field: 'accounts.Költség nemek',
      values: PayAccounts._transform(TulajdonosiBefizetesek),
    }, false, true);

    report.addTree('cols', {
      field: 'phase',
      values: PayAccounts._transform(phaseTags),
    }, true, false);

    return report;
  },
};
