import { Meteor } from 'meteor/meteor';
import { Sharedfolders } from './sharedfolders.js';

function initializeBuiltinFolders() {
  Sharedfolders.define({ _id: 'main' }, { _id: 'main', communityId: null, name: 'Main folder' });
  Sharedfolders.define({ _id: 'community' }, { _id: 'community', communityId: null, name: 'Founding documents' });
  Sharedfolders.define({ _id: 'voting' }, { _id: 'voting', communityId: null, name: 'Voting attachments' });
  Sharedfolders.define({ _id: 'agenda' }, { _id: 'agenda', communityId: null, name: 'Agenda records' });
  Sharedfolders.define({ _id: 'decision' }, { _id: 'decision', communityId: null, name: 'Decision logs' });
}

if (Meteor.isServer) {
  Meteor.startup(() => initializeBuiltinFolders());
}
