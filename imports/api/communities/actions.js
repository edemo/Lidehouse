import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { UploadFS } from 'meteor/jalik:ufs';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { setMeAsParcelOwner } from '/imports/api/parcels/actions.js';
import { Communities } from './communities.js';
import './methods.js';

Communities.actions = {
  create: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission('communities.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.create',
        collection: Communities,
        type: 'method',
        meteormethod: 'communities.insert',
      });
    },
  }),
  import: (options, doc, user= Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.super,
    run() {
      UploadFS.selectFile(function (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          let data = e.target.result;
          const json = JSON.parse(data);
          Modal.confirmAndCall(Communities.methods.unzip, { data: json }, {
            action: 'import',
            entity: 'community',
            message: `You are importing community ${_.pluck(json.communities, 'name')}`,
          });
        };
        reader.readAsText(file);
      });
    }
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('communities.details', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.view',
        collection: Communities,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.edit',
        collection: Communities,
        doc,
        type: 'method-update',
        meteormethod: 'communities.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.edit',
        collection: Communities,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'communities.update',
        singleMethodArgument: true,
      });
    },
  }),
  join: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'join',
    icon: 'fa fa-suitcase',
//    label: doc.settings?.joinable === 'withLink' ? 'join' : 'submit join request',
    visible: doc.settings && doc.joinable?.(),
    run() {
      const communityId = doc._id;
      const community = Communities.findOne(communityId);
      if (user.hasJoinedCommunity(communityId)) {  // should not let same person join twice
        FlowRouter.go('App home');
        return;
      }
      if (doc.status === 'sandbox' || doc.usesBlankParcels()) {   // Sandboxes have immediate (no questions asked) joining, with a fixed ownership share
        let units, type;
        if (doc.status === 'sandbox') {
          const language = doc.settings.language;
          type = TAPi18n.__('schemaParcels.type.flat', {}, language);
          units = 100;
        }
        Meteor.call('parcels.insert', 
          { communityId, category: community.propertyCategory(), approved: false, ref: 'auto' , units, type },
          onSuccess(res => setMeAsParcelOwner(res, communityId, onSuccess(r => FlowRouter.go('App home')),
          )),
        );
      } else {
        Modal.show('Autoform_modal', {
          title: 'pleaseSupplyParcelData',
          id: 'af.property.create.unapproved',
          schema: Parcels.simpleSchema({ category: community.propertyCategory() }),
          doc: { communityId },
          fields: ['communityId', 'ref', 'type', 'building', 'floor', 'door'],
          type: 'method',
          meteormethod: 'parcels.insert',
        });
      }
    },
  }),
  close: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'close',
    icon: 'fa fa-archive',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.close, { _id: doc._id }, {
        action: 'close',
        entity: 'community',
        message: 'It will become read only',
      });
    },
  }),
  zip: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'zip',
    icon: 'fa fa-download',
    visible: user.super,
    run() {
      Modal.confirmAndCall(Communities.methods.zip, { _id: doc._id }, {
        action: 'zip',
        entity: 'community',
        message: 'It will create a large export file in your downloads folder',
      }, (successful, data) => {
        if (!successful) return;
        const filename = `${doc.name}.export.json`;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        // Create invisible <a> element to trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        // Add to DOM → click → remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);        
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('communities.remove', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.remove, { _id: doc._id, force: user.super }, {
        action: 'delete',
        entity: 'community',
        message: 'It will disappear forever',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.community.create');
AutoForm.addModalHooks('af.community.edit');

AutoForm.addHooks('af.community.create', {
  formToDoc(doc) {
    if (doc.settings.modules.length === Communities.availableModules.length) delete doc.settings.modules;
    return doc;
  },
});
