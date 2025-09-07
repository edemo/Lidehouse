import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Templates } from '/imports/api/accounting/templates/templates.js';
import { Buckets } from './buckets.js';

export function defineBucketTemplates() {
  Templates.define({ name: 'Honline Társasház Sablon', buckets: [
    { code: '>', name: 'All Categories' },
    { code: '>1', name: 'Product' },
    { code: '>11', name: 'New Product' },
    { code: '>12', name: 'Used Product' },
    { code: '>13', name: 'Digital Product' },
    { code: '>2', name: 'Service' },
  ],
  });
}

Buckets.insertTemplateDoc = function insertTemplateDoc(templateId, doc) {
  const docToInsert = _.extend({ communityId: templateId }, doc);
  Buckets.updateOrInsert({ communityId: templateId, code: docToInsert.code }, docToInsert);
};

// To insert a new template doc: Just insert doc into the Template def
// To change anything other than the CODE on a template doc: just change it the Template def, and it will be changed at the next server start
// To change the CODE : change it the Template def AND use migration - Accounts.moveTemplate
// To remove a template doc: remove it from Template def AND use a migration - Accounts.moveTemplate + remove the doc from Template

if (Meteor.isServer) {
  Meteor.startup(defineBucketTemplates);
}
