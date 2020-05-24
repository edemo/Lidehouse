import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { displayMessage } from '/imports/ui_3/lib/errors.js';
import { importCollectionFromFile } from '/imports/data-import/import.js';
import { Partners } from '/imports/api/partners/partners.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';
import './methods.js';

Partners.actions = {
  new: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('partners.insert', doc),
    run() {
      const activeRelation = Session.get('activePartnerRelation');
      if (activeRelation) _.extend(doc, { relation: [activeRelation] });
      const statementEntry = StatementEntries._transform(Session.get('modalContext').statementEntry);
      if (statementEntry) _.deepExtend(doc, { idCard: { name: statementEntry.name }, relation: [statementEntry.impliedRelation()] });

      Modal.show('Autoform_modal', {
        id: 'af.partner.insert',
        collection: Partners,
        doc,
        type: 'method',
        meteormethod: 'partners.insert',
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('partners.upsert', doc),
    run: () => importCollectionFromFile(Partners),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('partners.details', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.partner.view',
        collection: Partners,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    color: () => {
      if (!doc || !doc.isApproved) return '';
      if (doc.isApproved()) return '';
      return doc.community().needsJoinApproval() ? 'danger' : 'warning';
    },
    visible: user.hasPermission('partners.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.partner.update',
        collection: Partners,
        doc,
        type: 'method-update',
        meteormethod: 'partners.update',
        singleMethodArgument: true,
      });
    },
  }),
  remindOutstandings: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'remindOutstandings',
    color: doc.mostOverdueDaysColor(),
    icon: 'fa fa-exclamation',
    visible: user.hasPermission('partners.remindOutstandings', doc) && (Session.get('activePartnerRelation') !== 'supplier') && doc.mostOverdueDays(),
    run() {
      if ((!doc.contact || !doc.contact.email) && !doc.userId) {
        displayMessage('warning', 'No contact email set for this partner');
      } else {
        Modal.confirmAndCall(Partners.methods.remindOutstandings, { _id: doc._id }, {
          action: 'remind outstandings',
          message: __('Sending outstandings reminder', doc.displayName() || __('undefined')),
        });
      }
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('partners.remove', doc),
    run() {
      Modal.confirmAndCall(Partners.methods.remove, { _id: doc._id }, {
        action: 'delete partner',
        message: 'It will disappear forever',
      });
    },
  }),
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.partner.insert');
AutoForm.addModalHooks('af.partner.update');

