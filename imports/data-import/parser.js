import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export class Parser {
  constructor(schema) {
    this.schema = schema;
  }

  parse(doc) {
    _.each(this.schema._schema, (schemaValue, key) => {
      const textValue = Object.getByString(doc, key);
      if (!textValue) return;
      switch (schemaValue.type.name) {
        case 'Date': {
          const date = moment.utc(textValue);
          if (!date.isValid()) throw new Meteor.Error('err_invalidData', `Invalid date in import: ${textValue}`);
          Object.setByString(doc, key, date.toDate());
          break;
        }
        case 'Fraction': {
          const fraction = new Fraction(textValue);
          if (!fraction) throw new Meteor.Error('err_invalidData', `Invalid fraction in import: ${textValue}`);
          Object.setByString(doc, key, fraction);
          break;
        }
        case 'Number': {
          const number = schemaValue.decimal ? parseFloat(textValue) : parseInt(textValue, 10);
          if (isNaN(number)) throw new Meteor.Error('err_invalidData', `Invalid number in import: ${textValue}`);
          Object.setByString(doc, key, number);
          break;
        }
        case 'Boolean': {
          let boolean;
          switch (textValue.toLowerCase().trim()) {
            case 'true': case 'yes': case '1': boolean = true; break;
            case 'false': case 'no': case '0': case null: boolean = false; break;
            default: boolean = Boolean(textValue);
          }
          Object.setByString(doc, key, boolean);
          break;
        }
        case 'String':
        case 'Object':
        case 'Array': break;
        default: productionAssert(false, `Not able to parse ${schemaValue.type.name}`);
      }
    });
  }
}
