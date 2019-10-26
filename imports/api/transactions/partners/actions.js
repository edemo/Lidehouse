import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Partners } from '../partners/partners.js';
import './methods.js';

export function allPartnersActions() {
  Partners.actions = Partners.actions || {
    collection: Partners,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      visible: () => currentUserHasPermission('partners.insert'),
      run(id, event, instance) {
        Modal.show('Autoform_edit', {
          id: 'af.partner.insert',
          collection: Partners,
          type: 'method',
          meteormethod: 'partners.insert',
        });
      },
    },
    view: {
      name: 'view',
      icon: 'fa fa-eye',
      visible: () => currentUserHasPermission('partners.inCommunity'),
      run(id) {
        const doc = Partners.findOne(id);
        // TODO
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      visible: () => currentUserHasPermission('partners.update'),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.partner.update',
          collection: Partners,
          doc: Partners.findOne(id),
          type: 'method-update',
          meteormethod: 'partners.update',
          singleMethodArgument: true,
        });
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      visible: () => currentUserHasPermission('partners.remove'),
      run(id) {
        Modal.confirmAndCall(Partners.methods.remove, { _id: id }, {
          action: 'delete partner',
          message: 'It will disappear forever',
        });
      },
    },
  };
  return Partners.actions;
}

export function getPartnersActionsSmall() {
  allPartnersActions();
  const actions = [
//    Partners.actions.view,
    Partners.actions.edit,
    Partners.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.partner.insert');
AutoForm.addModalHooks('af.partner.update');

AutoForm.addHooks('af.partner.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
