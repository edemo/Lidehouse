import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Timestamps } from '/imports/api/timestamps.js';
import { Journals } from './journals.js';
import { Breakdowns } from '../journals/breakdowns/breakdowns.js';

export const TxDefs = new Mongo.Collection('txDefs');

let chooseAccountFamily = {};
let chooseAccountNode = () => { return {}; };
let chooseAccountGroup = () => { return {}; };

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { AutoForm } from 'meteor/aldeed:autoform';
  import { __ } from '/imports/localization/i18n.js';

  chooseAccountFamily = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
      return accountFamilies.map((family) => { return { value: family._id, label: family.name }; });
    },
  };

  chooseAccountNode = function (move) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        const accountFamily = AutoForm.getFieldValue(move + '.accountFamily', 'af.txtype.insert')
                          || AutoForm.getFieldValue(move + '.accountFamily', 'af.txtype.update');
        if (!accountFamily) return [{ label: __('schemaJournals.account.placeholder'), value: 'none' }];
        const pac = Breakdowns.findOne({ communityId, name: accountFamily });
        return pac.leafOptions();
      },
    };
  };

  chooseAccountGroup = function (move) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
        let accountTree = { name: 'Accounts', children: [] };
        accountFamilies.forEach(family => accountTree.children.push(family));
        accountTree = Breakdowns._transform(accountTree);
        return accountTree.leafOptions();
      },
    };
  };
}

const accountNodeSchema = function (move) {
  return new SimpleSchema({
//    accountFamily: { type: 'String', autoform: chooseAccountFamily },
    accountGroup: { type: 'String', autoform: chooseAccountGroup(move) },
    localizerNeeded: { type: Boolean, defaultValue: false },
  });
};

const TransactionSchema = new SimpleSchema({
  accountFrom: { type: accountNodeSchema('accountFrom') },
  accountTo: { type: accountNodeSchema('accountTo') },
});

TxDefs.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  journals: { type: Array },
  'journals.$': { type: TransactionSchema },
});

TxDefs.attachSchema(TxDefs.schema);
TxDefs.attachSchema(Timestamps);

Meteor.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});
