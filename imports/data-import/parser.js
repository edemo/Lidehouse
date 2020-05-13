import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { moment } from 'meteor/momentjs:moment';
import XLSX from 'xlsx';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export class Parser {
  constructor(schema) {
    this.schema = schema;
  }

  static parseValue(cellValue, typeName, schemaValue) {
    switch (typeName) {
      case 'Date': {
        const d = XLSX.SSF.parse_date_code(cellValue); // XLSX stores date cells as number, and can parse it into its own object format
        const utc = moment.utc([d.y, d.m - 1, d.d]);
        if (!utc.isValid()) throw new Meteor.Error('err_invalidData', `Invalid date in import: ${cellValue}`);
        return utc.toDate();
      }
      case 'Fraction': {
        const fraction = new Fraction(cellValue);
        if (!fraction) throw new Meteor.Error('err_invalidData', `Invalid fraction in import: ${cellValue}`);
        return fraction;
      }
      case 'Number': {
        if (!cellValue) return 0;
        const number = schemaValue.decimal ? parseFloat(cellValue) : parseInt(cellValue, 10);
        if (isNaN(number)) throw new Meteor.Error('err_invalidData', `Invalid number in import: ${cellValue}`);
        return number;
      }
      case 'Boolean': {
        let boolean;
        switch (cellValue.toLowerCase().trim()) {
          case 'true': case 'yes': case '1': boolean = true; break;
          case 'false': case 'no': case '0': case null: boolean = false; break;
          default: boolean = Boolean(cellValue);
        }
        return boolean;
      }
      case 'String':
      case 'Object':
      case 'Array': return cellValue;
      default: productionAssert(false, `Don't know how to parse ${typeName}`); return undefined;
    }
  }

  parse(doc) {
    _.each(this.schema._schema, (schemaValue, key) => {
      const cellValue = Object.getByString(doc, key);
      if (!cellValue) return;
      const parsedValue = Parser.parseValue(cellValue, schemaValue.type.name, schemaValue);
      if (parsedValue !== cellValue) Object.setByString(doc, key, parsedValue);
    });
  }
}
