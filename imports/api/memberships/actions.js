import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Memberships } from './memberships';
import './methods.js';

Memberships.actions = {
  new: {
    name: 'new',
    icon: 'fa fa-plus',
    visible: () => currentUserHasPermission('memberships.insert'),
    run(entity, event, instance) {
      switch (entity) {
//        case 'owner':
//        case 'benfactor':
        case 'delegate':
          Modal.show('Autoform_edit', {
            id: 'af.delegate.insert',
            collection: Memberships,
            fields: ['person', 'activeTime'],
            omitFields: ['person.userId'],
            type: 'method',
            meteormethod: 'memberships.insert',
          });
          break;
        default: debugAssert(false, 'No such entity');
      }
    },
  },
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.delegate.insert');
AutoForm.addModalHooks('af.delegate.update');
AutoForm.addHooks('af.delegate.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.approved = true;
    doc.role = 'delegate';
    return doc;
  },
});
