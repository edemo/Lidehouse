import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { AutoForm } from 'meteor/aldeed:autoform';

import { Clock } from '/imports/utils/clock.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { remove as removeSharedfolders } from '/imports/api/shareddocs/sharedfolders/methods.js';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '../common/page-heading.html';
import '../components/shareddoc-display.js';
import './shareddoc-store.html';

Template.Shareddoc_store.onCreated(function () {
  this.activeFolderId = new ReactiveVar('main');
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    if (communityId) {
      this.subscribe('sharedfolders.ofCommunity', { communityId });
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
  builtinFolders() {
    return Sharedfolders.find({ communityId: { $exists: false } });
  },
  communityFolders() {
    const communityId = Session.get('activeCommunityId');
    return Sharedfolders.find({ communityId });
  },
  isActive(folderId) {
    return Template.instance().activeFolderId.get() === folderId;
  },
  activeFolderId() {
    return Template.instance().activeFolderId.get();
  },
  activeFolder() {
    const id = Template.instance().activeFolderId.get();
    return Sharedfolders.findOne(id);
  },
  shareddocs() {
    const communityId = Session.get('activeCommunityId');
    const folderId = Template.instance().activeFolderId.get();
    if (!communityId || !folderId) return [];
    let containedFiles = Shareddocs.find({ communityId, folderId }, { sort: { createdAt: -1 } });
    return containedFiles;
  },
  extensions() {
    return ['doc', 'pdf', 'mpg'];
  },
});

Template.Shareddoc_store.events({
  'click button[name=upload]'(event) {
    const button = $(event.target.closest('button'));
    if (button.hasClass('disabled')) return;
    Shareddocs.upload({
      communityId: Session.get('activeCommunityId'),
      folderId: Template.instance().activeFolderId.get(),
    });
  },
  'click .js-select'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Template.instance().activeFolderId.set(_id);
  },
  'click .js-new'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.sharedfolder.insert',
      collection: Sharedfolders,
      omitFields: ['communityId'],
      type: 'method',
      meteormethod: 'sharedfolders.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.sharedfolder.update',
      collection: Sharedfolders,
      doc: Sharedfolders.findOne(_id),
      omitFields: ['communityId'],
      type: 'method-update',
      meteormethod: 'sharedfolders.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .file-manager .js-delete'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Modal.confirmAndCall(removeSharedfolders, { _id }, {
      action: 'delete sharedfolder',
      message: 'This will delete all contained files as well',
    });
  },
});

AutoForm.addModalHooks('af.sharedfolder.insert');
AutoForm.addModalHooks('af.sharedfolder.update');
AutoForm.addHooks('af.sharedfolder.insert', {
    formToDoc(doc) {
        doc.communityId = Session.get('activeCommunityId');
        return doc;
    },
});
