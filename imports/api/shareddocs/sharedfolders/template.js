import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { Sharedfolders } from './sharedfolders.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';

Sharedfolders.insertTemplateDoc = function insertTemplateDoc(templateId, doc) {
  const docToInsert = _.extend({ communityId: templateId }, doc);
  Sharedfolders.updateOrInsert({ communityId: templateId, content: doc.content }, docToInsert);
};

export function defineSharedFoldersTemplates() {
  Templates.define({ name: 'Honline Társasház Sablon', sharedfolders: [
    { content: 'main', name: 'Main folder' },
    { content: 'community', name: 'Founding documents' },
    { content: 'contract', name: 'Contracts' },
    { content: 'voting', name: 'Voting attachments' },
    { content: 'agenda', name: 'Agenda records' },
    { content: 'transaction', name: 'Transaction records' },
  ],
  });
}

if (Meteor.isServer) {
  Meteor.startup(() => defineSharedFoldersTemplates());
}
