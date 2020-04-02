import { Meteor } from 'meteor/meteor';
import { Sharedfolders } from './sharedfolders.js';

Sharedfolders.define = function define(doc) {
  Sharedfolders.upsert({ _id: doc._id }, { $set: doc });
};

export function initializeBuiltinFolders() {
  Sharedfolders.define({ _id: 'main', communityId: null, name: 'Main folder' });
  Sharedfolders.define({ _id: 'community', communityId: null, name: 'Founding documents' });
  Sharedfolders.define({ _id: 'contract', communityId: null, name: 'Contracts' });
  Sharedfolders.define({ _id: 'voting', communityId: null, name: 'Voting attachments' });
  Sharedfolders.define({ _id: 'agenda', communityId: null, name: 'Agenda records' });
}

if (Meteor.isServer) {
  Meteor.startup(() => initializeBuiltinFolders());
}
