/* eslint-disable class-methods-use-this */

import { EJSON } from 'meteor/ejson';
import { Fraction } from 'fractional';

Fraction.prototype.parse = function parse(value) {
  return new Fraction(value);
};

Fraction.prototype.toJSONValue = function toJSONValue() {
  return {
    numerator: this.numerator,
    denominator: this.denominator,
  };
};

Fraction.prototype.typeName = function typeName() {
  return 'Fraction';
};

Fraction.prototype.toNumber = function toNumber() {
  return this.numerator / this.denominator;
};

Fraction.prototype.toStringLong = function toStringLong() {
  if (this.numerator === this.denominator) return '1/1';
  return this.toString();
};

// FIXME: We are trying to override normalize here, to switch it off, but it still uses the original version
Fraction.prototype.normalize = function normalize() {
  return this;
};

EJSON.addType('Fraction', function fromJSONValue(json) {
  return new Fraction(json.numerator, json.denominator);
});
