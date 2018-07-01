/*
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Timestamps } from '/imports/api/timestamps.js';
import { Journals } from './journals.js';
import { Breakdowns } from '../journals/breakdowns/breakdowns.js';

export const TxDefs = new Mongo.Collection('txDefs');

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

//    return new SimpleSchema([
//      Journals.simpleSchema(),
//      { accountFrom: { type: chooseAccountsSchema('accountFrom'), optional: true } },
//      { accountTo: { type: chooseAccountsSchema('accountTo'), optional: true } },
//    ]);

    return new SimpleSchema({
      valueDate: { type: Date },
      amount: { type: Number },
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
*/
