import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import '../common/page-heading.html';
import '../components/shareddoc-display.js';
import './shareddoc-store.html';

Template.Shareddoc_store.onCreated(function () {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    if (communityId) {
      this.subscribe('shareddocs.ofCommunity', { communityId });
    }
  });
});

Template.Shareddoc_store.helpers({
  storeHasDocuments() {
    const activeCommunityId = Session.get('activeCommunityId');
    if (!activeCommunityId) return false;
    return Shareddocs.find({ communityId: activeCommunityId }).count() > 0;
  },
  shareddocs() {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      return Shareddocs.find({
        communityId: activeCommunityId,
        agendaId: { $exists: false },
        topicId: { $exists: false },
      }, { sort: { createdAt: -1 } });
    }
  },
  dummyDocs() { // temp hack only
    debugger;
    return [2014, 2015, 2016, 2017, 2018].map(function(year) {
      return {
        name: 'Document_' + year.toString() + '.doc',
        createdAt: new Date(),
      };
    });
  },
});

Template.Shareddoc_store.events({
  'click button[name=upload]'(event) {
    Shareddocs.upload({ communityId: Session.get('activeCommunityId') });
  },
});
