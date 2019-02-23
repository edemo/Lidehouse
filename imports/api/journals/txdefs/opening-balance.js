import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';

import { Journals } from '/imports/api/journals/journals.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const OpeningBalanceTx = {
  name: 'Opening balance tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      account: { type: String, autoform: chooseLeafAccountFromGroup() },
      localizer: { type: String, autoform: chooseLeafAccountFromGroup('Localizer') },
    },
  ]),
  transformToJournal(doc) {
    const communityId = Session.get('activeCommunityId');
    doc.credit = [{
      account: Breakdowns.name2code('Liabilities', 'Opening', communityId),
      localizer: doc.localizer,
    }];
    doc.debit = [{
      account: doc.account,
      localizer: doc.localizer,
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  OpeningBalanceTx.schema.i18n('schemaJournals');
});
