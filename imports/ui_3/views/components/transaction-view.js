import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';

import './transaction-view.html';

Template.Transaction_view.viewmodel({
  onCreated(instance) {
  },
  subTxs() {
    const result = [];
    const doc = this.templateInstance.data.doc;
    for (let i = 0; i < 100; i++) {
      const docClone = _.clone(doc);
      docClone.debit = doc.debit.filter(je => (i ? (je.subTx === i) : (je.subTx === 0 || je.subTx === undefined)));
      if (docClone.debit.length === 0) break;
      docClone.credit = doc.credit.filter(je => (i ? (je.subTx === i) : (je.subTx === 0 || je.subTx === undefined)));
      result.push(docClone);
    }
    return result;
  },
});
