import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { moment } from 'meteor/momentjs:moment';
import XLSX from 'xlsx';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners';
import { Parcels } from '/imports//api/parcels/parcels';

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export class Parser {
  constructor(schema) {
    this.schema = schema;
  }

  static parseValue(cellValue, doc, typeName, schemaValue) {
    switch (typeName) {
      case 'Date': {
        if (cellValue instanceof Date) return cellValue;
        let utc;
        if (typeof cellValue === 'string') {
          utc = moment.utc(cellValue);
        } else if (typeof cellValue === 'number') {
          if (19700101 < cellValue && cellValue < 20991231) { // ehaz format
            utc = moment.utc('' + cellValue);
          } else {
            const d = XLSX.SSF.parse_date_code(cellValue); // XLSX stores date cells as number, and can parse it into its own object format
            utc = moment.utc([d.y, d.m - 1, d.d]);
          }
        }
        if (!utc?.isValid()) throw new Meteor.Error('err_invalidData', 'Invalid date in import', { cellValue });
        return utc.toDate();
      }
      case 'Fraction': {
        if (cellValue instanceof Fraction) return cellValue;
        const fraction = new Fraction(cellValue);
        if (!fraction) throw new Meteor.Error('err_invalidData', 'Invalid fraction in import', { cellValue });
        return fraction;
      }
      case 'Number': {
        if (cellValue instanceof Number) return cellValue;
        if (!cellValue) return 0;
        const number = schemaValue.decimal ? parseFloat(cellValue) : parseInt(cellValue, 10);
        if (isNaN(number)) throw new Meteor.Error('err_invalidData', 'Invalid number in import', { cellValue });
        return number;
      }
      case 'Boolean': {
        if (cellValue instanceof Boolean) return cellValue;
        let boolean;
        switch (cellValue.toLowerCase().trim()) {
          case 'true': case 'yes': case '1': boolean = true; break;
          case 'false': case 'no': case '0': case null: boolean = false; break;
          default: boolean = Boolean(cellValue);
        }
        return boolean;
      }
      case 'String': {
        switch (schemaValue?.autoform?.relation) {
          case '@property': {
            try {
              check(cellValue, Meteor.Collection.ObjectID);
              return cellValue;
            } catch (err) {
              const parcel = Parcels.findOne({ communityId: doc.communityId, ref: cellValue.toString() });
              productionAssert(parcel, 'No parcel with this ref', { cellValue });
              return parcel?._id;
            }
          }
          case 'partner': {
            try {
              check(cellValue, Meteor.Collection.ObjectID);
              return cellValue;
            } catch (err) {
              if (isNaN(cellValue)) {  // name
                const partner = Partners.findOne({ communityId: doc.communityId, 'idCard.name': cellValue });
                productionAssert(partner, 'No partner with this name', { cellValue });
                return partner?._id;
              } else {                // ref number
                const partner = Partners.findOne({ communityId: doc.communityId, ref: cellValue });
                productionAssert(partner, 'No partner with this ref', { cellValue });
                return partner?._id;
              }
            }
          }
          default: return cellValue.toString();
        }
      }
      case 'Object':
      case 'Array': return cellValue;
      default: productionAssert(false, 'Dont know how to parse', { typeName }); return undefined;
    }
  }

  parse(doc) {
    _.each(this.schema._schema, (schemaValue, key) => {
      const cellValue = Object.getByString(doc, key);
      if (!cellValue) return;
      const parsedValue = Parser.parseValue(cellValue, doc, schemaValue.type.name, schemaValue);
      if (parsedValue !== cellValue) Object.setByString(doc, key, parsedValue);
    });
  }
}
