import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import { remove as removeSharedfolders } from '/imports/api/shareddocs/sharedfolders/methods.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '../common/page-heading.html';
import '/imports/ui_3/views/blocks/help-icon.js';
import '../components/shareddoc-display.js';
import './shareddoc-store.html';

Template.Shareddoc_store.viewmodel({
  sortBy: 'name',
  sortDirection: 1,
  viewMode: 'grid',
  activeFolderId: 'main',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      if (communityId) {
        instance.subscribe('sharedfolders.ofCommunity', { communityId });
        instance.subscribe('shareddocs.ofCommunity', { communityId });
      }
    });
  },
  storeHasDocuments() {
    const activeCommunityId = ModalStack.getVar('communityId');
    if (!activeCommunityId) return false;
    return Shareddocs.find({ communityId: activeCommunityId }).count() > 0;
  },
  builtinFolders() {
    return Sharedfolders.find({ communityId: null });
  },
  communityFolders() {
    const communityId = ModalStack.getVar('communityId');
    return Sharedfolders.find({ communityId });
  },
  isActive(folderId) {
    return this.activeFolderId() === folderId;
  },
  activeFolder() {
    const id = this.activeFolderId();
    return Sharedfolders.findOne(id);
  },
  disabledUpload() {
    if (!Meteor.userOrNull().hasPermission('shareddocs.upload')) return 'disabled';
    return this.activeFolder()?.externalUrl && 'disabled';
  },
  shareddocs() {
    const communityId = ModalStack.getVar('communityId');
    const folderId = this.activeFolderId();
    if (!communityId || !folderId) return [];
    let containedFiles;
    const sortBy = this.sortBy();
    const sortDirection = this.sortDirection();
    if (sortBy === 'name') {
      const community = Communities.findOne(communityId);
      const sharedDocs = Shareddocs.find({ communityId, folderId }).fetch();
      containedFiles = sharedDocs.fetch().sort((a, b) => a.name.localeCompare(b.name, community.settings.language, { sensitivity: 'accent' }));
      if (sortDirection === '-1') containedFiles = containedFiles.reverse();
    } else {
      containedFiles = Shareddocs.find({ communityId, folderId }, { sort: { [sortBy]: sortDirection } });
    }
    return containedFiles;
  },
  reactiveTableDataFn() {
    const self = this;
    return () => self.shareddocs();
  },
  optionsFn() {
    return () => Object.create({
      columns: shareddocsColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
    });
  },
  embedUrl(externalUrl) {
    const split = externalUrl.split('/');
    const folderId = _.last(split).split('?')[0];
    debugAssert(split[2] === 'drive.google.com' && folderId.length === 33);
    return `https://drive.google.com/embeddedfolderview?id=${folderId}#${this.viewMode()}`;
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
      communityId: ModalStack.getVar('communityId'),
      folderId: Template.instance().viewmodel.activeFolderId(),
    });
  },
  'click .js-select'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Template.instance().viewmodel.activeFolderId(_id);
  },
  'click .js-create'(event) {
    Modal.show('Autoform_modal', {
      id: 'af.sharedfolder.create',
      collection: Sharedfolders,
      doc: defaultNewDoc(),
      type: 'method',
      meteormethod: 'sharedfolders.insert',
    });
  },
  'click .js-edit'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Modal.show('Autoform_modal', {
      id: 'af.sharedfolder.edit',
      collection: Sharedfolders,
      doc: Sharedfolders.findOne(_id),
      type: 'method-update',
      meteormethod: 'sharedfolders.update',
      singleMethodArgument: true,
    });
  },
  'click .file-manager .js-delete'(event) {
    const a = event.target.closest('a');
    const _id = $(a).data('id');
    Modal.confirmAndCall(removeSharedfolders, { _id }, {
      action: 'delete',
      entity: 'sharedfolder',
      message: 'This will delete all contained files as well',
    });
  },
});

AutoForm.addModalHooks('af.sharedfolder.create');
AutoForm.addModalHooks('af.sharedfolder.edit');
