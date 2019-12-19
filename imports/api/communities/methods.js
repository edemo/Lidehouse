import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { officerRoles } from '/imports/api/permissions/roles.js';
import { checkLoggedIn, checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Leaderships } from '/imports/api/leaderships/leaderships.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Statements } from '/imports/api/transactions/statements/statements.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Attachments } from '/imports/api/attachments/attachments.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Communities } from './communities.js';

export const create = new ValidatedMethod({
  name: 'communities.create',
  validate: Communities.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkLoggedIn(this.userId);
    checkNotExists(Communities, { name: doc.name });
    const communityId = Communities.insert(doc);
    
    // The user creating the community, becomes the first 'admin' of it.
    Memberships.insert({ communityId, person: { userId: this.userId }, role: 'admin', approved: true, accepted: true });
    return communityId;
  },
});

export const update = new ValidatedMethod({
  name: 'communities.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Communities, _id);
    // checkModifier(doc, modifier, ['lot'], true);     // all fields are modifiable except lot
    checkPermissions(this.userId, 'communities.update', doc);
    Communities.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'communities.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Communities, _id);
    const communityId = _id;
    checkPermissions(this.userId, 'communities.remove', doc);
    // Community cannot be deleted while it has any active officers apart from the admin
    const officers = Memberships.findActive({ communityId, role: { $in: officerRoles } });
    if (officers.count() > 1) {
      throw new Meteor.Error('err_unableToRemove',
      'Community cannot be deleted while it has active officers', `Found: {${officers.count()}}`);
    }
    // Once there are no active officers, the community can be purged
    Meters.remove({ communityId });
    Memberships.remove({ communityId });
    Leaderships.remove({ communityId });
    Comments.remove({ communityId });
    Topics.remove({ communityId });
    Agendas.remove({ communityId });
    Delegations.remove({ communityId });
    Transactions.remove({ communityId });
    ParcelBillings.remove({ communityId });
    Balances.remove({ communityId });
    Statements.remove({ communityId });
    StatementEntries.remove({ communityId });
    TxCats.remove({ communityId });
    Breakdowns.remove({ communityId });
    Parcels.remove({ communityId });
    Partners.remove({ communityId });
    Contracts.remove({ communityId });
    Attachments.remove({ communityId });
    Shareddocs.remove({ communityId });
    Sharedfolders.remove({ communityId });
    Communities.remove(communityId);
  },
});

Communities.methods = Communities.methods || {};
_.extend(Communities.methods, { create, update, remove });
