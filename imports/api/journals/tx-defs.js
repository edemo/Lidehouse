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
let chooseAccountGroup = {};

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

  chooseAccountGroup = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountMirror = Breakdowns.accountMirror(communityId);
      return accountMirror.nodeOptions();
    },
  };
}

const JournalDefSchema = new SimpleSchema({
  accountFrom: { type: String, autoform: chooseAccountGroup },
  accountTo: { type: String, autoform: chooseAccountGroup },
});

TxDefs.schema = new SimpleSchema({
  name: { type: String },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  journals: { type: Array },
  'journals.$': { type: JournalDefSchema },
});

TxDefs.helpers({
  newTxSchema() {
    function chooseAccountsSchema() {
      const communityId = Session.get('activeCommunityId');
      const mainAccounts = Breakdowns.find({ communityId, sign: { $exists: true } });
      const localizerPac = Breakdowns.findOne({ communityId, name: 'Localizer' });
    
      return new SimpleSchema({
        account: { type: String, autoform: { options() { return mainAccounts.map(a => { return { value: a.name, label: a.name }; }); } } },
        localizer: { type: String, autoform: { options() { return localizerPac.leafOptions(); } } },
      });
    }
/*
    return new SimpleSchema([
      Journals.simpleSchema(),
      { accountFrom: { type: chooseAccountsSchema('accountFrom'), optional: true } },
      { accountTo: { type: chooseAccountsSchema('accountTo'), optional: true } },
    ]);
*/
    return new SimpleSchema({
      valueDate: { type: Date },
      amount: { type: Number, decimal: true },
      accounts: { type: Array, optional: true },
      'accounts.$': { type: Object, blackbox: true },
      ref: { type: String, max: 100, optional: true },
      note: { type: String, max: 100, optional: true },
    });

  },
});


TxDefs.attachSchema(TxDefs.schema);
TxDefs.attachSchema(Timestamps);

Meteor.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});

// TODO: restrict
TxDefs.allow({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
