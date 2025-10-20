import { debugAssert } from '/imports/utils/assert.js';

export const Relations = {};

Relations.values = ['supplier', 'customer', 'member'];
Relations.mainValues = ['supplier', 'customer'];

Relations.side = function relationSide(relation) {
  if (relation === 'supplier') return 'credit';
  else if (relation === 'customer' || relation === 'member') return 'debit';
  debugAssert(false, 'No such relation ' + relation); return undefined;
};

Relations.sign = function relationSign(relation) {
  if (relation === 'supplier') return -1;
  else if (relation === 'customer' || relation === 'member') return +1;
  debugAssert(false, 'No such relation ' + relation); return undefined;
};

Relations.opposite = function opposite(relation) {
  if (relation === 'supplier') return 'customer';
  else if (relation === 'customer') return 'supplier';
  debugAssert(false, 'No opposite relation for ' + relation); return undefined;
};
