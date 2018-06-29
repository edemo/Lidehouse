import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
// import { Txs } from '/imports/api/journals/txs.js';
// import { TxDefs } from '/imports/api/journals/tx-defs.js';

export const insert = new ValidatedMethod({
  name: 'journals.insert',
  validate: Journals.simpleSchema().validator({ clean: true }),

  run(doc) {
    const id = Journals.insert(doc);
    
    // Posting rules
    if (doc.legs[0].account['Incomes'] && doc.legs[0].move === 'from' &&
        doc.legs[1].account['Assets'] ) {
      const newDoc = _.clone(doc);
      newDoc.legs = [{
        move: 'from',
        account: {
          'Assets': doc.legs[0].account['Incomes'],  // Obligation decreases
          'Localizer': doc.legs[0].account['Localizer'],
        },
      }, {
        move: 'to',
        account: {
          'Owners': doc.legs[0].account['Incomes'],
          'Localizer': doc.legs[0].account['Localizer'],
        },
      }];
      Journals.insert(newDoc);
    }
    return id;
  },
});

export const revert = new ValidatedMethod({
  name: 'journals.revert',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    // TODO
  },
});

//---------------------------------------------
/*
export const insert = new ValidatedMethod({
  name: 'txDefs.insert',
  validate: TxDefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    return TxDefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txDefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    TxDefs.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'txDefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    TxDefs.remove(_id);
  },
});
*/

