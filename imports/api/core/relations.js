import { debugAssert } from '/imports/utils/assert.js';

export const Relations = {};

Relations.values = ['supplier', 'customer', 'member'];
Relations.mainValues = ['supplier', 'customer'];

Relations.sign = function relationSign(relation) {
  if (relation === 'supplier') return -1;
  else if (relation === 'customer' || relation === 'member') return +1;
  debugAssert(false, 'No such relation ' + relation); return undefined;
};
