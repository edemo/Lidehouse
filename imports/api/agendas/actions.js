import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Agendas } from './agendas.js';
import './methods.js';

Agendas.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('agendas.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.insert',
        collection: Agendas,
        type: 'method',
        meteormethod: 'agendas.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('agendas.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.view',
        collection: Agendas,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('agendas.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.update',
        collection: Agendas,
        doc,
        type: 'method-update',
        meteormethod: 'agendas.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('agendas.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Agendas.methods.remove, { _id: doc._id }, {
        action: 'delete agenda',
        message: 'This will not delete topics',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.agenda.insert');
AutoForm.addModalHooks('af.agenda.update');
AutoForm.addHooks('af.agenda.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
