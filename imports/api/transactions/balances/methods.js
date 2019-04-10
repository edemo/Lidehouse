
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Balances } from '/imports/api/transactions/balances/balances.js';
import { checkExists, checkNotExists, checkPermissions, checkConstraint } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'balances.insert',
  validate: Balances.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Balances, { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: doc.tag });
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    checkConstraint(doc.tag.startsWith('C-'), 'Only closing balances can be inserted directly');

    return Balances.insert(doc);
  },
});

Balances.methods = {
  insert,
};
