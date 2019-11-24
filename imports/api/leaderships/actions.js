import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Fraction } from 'fractional';
import { AccountsTemplates } from 'meteor/useraccounts:core';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Leaderships } from './leaderships.js';
import './methods.js';

Leaderships.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('leaderships.insert'),
    run(id, event, instance) {
      Modal.show('Autoform_edit', {
        id: 'af.leadership.insert',
        collection: Leaderships,
        omitFields: ['parcelId', 'leadParcelId'],
        type: 'method',
        meteormethod: 'leaderships.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('leaderships.inCommunity'),
    run(id) {
      Modal.show('Autoform_edit', {
        id: 'af.leadership.view',
        collection: Leaderships,
        doc: Leaderships.findOne(id),
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('leaderships.update'),
    run(id) {
      Modal.show('Autoform_edit', {
        id: 'af.leadership.update',
        collection: Leaderships,
        omitFields: ['parcelId', 'leadParcelId'],
        doc: Leaderships.findOne(id),
        type: 'method-update',
        meteormethod: 'leaderships.update',
        singleMethodArgument: true,
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible: () => currentUserHasPermission('leaderships.update'),
    run(id) {
      Modal.show('Autoform_edit', {
        id: 'af.leadership.update',
        collection: Leaderships,
        fields: ['activeTime'],
        doc: Leaderships.findOne(id),
        type: 'method-update',
        meteormethod: 'leaderships.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: () => currentUserHasPermission('leaderships.remove'),
    run(id) {
      Modal.confirmAndCall(Leaderships.methods.remove, { _id: id }, {
        action: 'delete leadership',
        message: 'You should rather archive it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.leadership.insert');
AutoForm.addModalHooks('af.leadership.update');
AutoForm.addHooks('af.leadership.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('selectedCommunityId');
    doc.parcelId = Session.get('selectedParcelId');
    //    doc.approved = true;
    return doc;
  },
});
AutoForm.addHooks('af.leadership.update', {
  formToModifier(modifier) {
    delete modifier.$set.leadParcelId; // not working
    modifier.$set.communityId = Session.get('selectedCommunityId');
    return modifier;
  },
});
