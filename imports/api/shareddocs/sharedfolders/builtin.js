import { Meteor } from 'meteor/meteor';
import { Sharedfolders } from './sharedfolders.js';

function initializeBuiltinFolders() {
  Sharedfolders.upsert({ _id: 'main' }, { $set: { name: 'Main folder' } });
  Sharedfolders.upsert({ _id: 'community' }, { $set: { name: 'Founding documents' } });
  Sharedfolders.upsert({ _id: 'voting' }, { $set: { name: 'Voting attachments' } });
  Sharedfolders.upsert({ _id: 'agenda' }, { $set: { name: 'Agenda records' } });
  Sharedfolders.upsert({ _id: 'decision' }, { $set: { name: 'Decision logs' } });
}

if (Meteor.isServer) {
  Meteor.startup(() => initializeBuiltinFolders());
}
