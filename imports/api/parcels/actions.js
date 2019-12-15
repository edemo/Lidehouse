import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Fraction } from 'fractional';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Parcels } from './parcels.js';
import './methods.js';

Parcels.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('parcels.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcel.insert',
        collection: Parcels,
        type: 'method',
        meteormethod: 'parcels.insert',
      });
    },
  },
  import: {
    name: 'import',
    icon: () => 'fa fa-upload',
    visible: (options, doc) => currentUserHasPermission('parcels.upsert', doc),
    run: () => importCollectionFromFile(Parcels),
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('parcels.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcel.view',
        collection: Parcels,
        doc,
        type: 'readonly',
      });
    },
  },
  occupants: {
    name: 'occupants',
    icon: (options, doc) => (doc && doc.isLed() ? 'fa fa-user-o' : 'fa fa-user'),
    color: (options, doc) => {
      let colorClass = '';
      if (Memberships.findOneActive({ parcelId: doc._id, approved: false })) colorClass = 'danger';
      else {
        const representor = Memberships.findOneActive({ parcelId: doc._id, 'ownership.representor': true });
        if (representor) {
          if (!representor.accepted) {
            if (!representor.personId) colorClass = 'warning';
            else colorClass = 'info';
          }
        } else {  // no representor
          if (Memberships.findOneActive({ parcelId: doc._id, accepted: false })) {
            if (Memberships.findOneActive({ parcelId: doc._id, personId: { $exists: false } })) colorClass = 'warning';
            else colorClass = 'info';
          }
        }
      }
      return colorClass;
    },
    visible: (options, doc) => currentUserHasPermission('memberships.inCommunity', doc),
    run(options, doc, event, instance) {
      Modal.show('Modal', {
        title: `${doc ? doc.display() : __('unknown')} - ${__('occupants')}`,
        body: 'Occupants_box',
        bodyContext: {
          communityId: doc.communityId,
          parcelId: doc._id,
        },
        size: currentUserHasPermission('memberships.details', doc) ? 'lg' : 'md',
      });
    },
  },
  meters: {
    name: 'meters',
    icon: () => 'fa fa-tachometer',
    visible: (options, doc) => {
      return currentUserHasPermission('meters.insert', doc) || currentUserHasPermission('meters.insert.unapproved', doc);
    },
    run(options, doc, event, instance) {
      Modal.show('Modal', {
        title: `${doc ? doc.display() : __('unknown')} - ${__('meters')}`,
        body: 'Meters_box',
        bodyContext: {
          communityId: doc.communityId,
          parcelId: doc._id,
        },
        size: currentUserHasPermission('meters.update', doc) ? 'lg' : 'md',
      });
    },
  },
  finances: {
    name: 'finances',
    icon: () => 'fa fa-money',
    visible: (options, doc) => currentUserHasPermission('parcels.inCommunity', doc),
    href: () => '#view-target',
    run(options, doc, event, instance) {
      instance.viewmodel.parcelToView(doc._id);
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('parcels.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcel.update',
        collection: Parcels,
        doc,
        type: 'method-update',
        meteormethod: 'parcels.update',
        singleMethodArgument: true,
      });
    },
  },
  period: {
    name: 'period',
    icon: () => 'fa fa-history',
    visible: (options, doc) => currentUserHasPermission('parcels.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcel.update',
        collection: Parcels,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'parcels.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('parcels.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Parcels.methods.remove, { _id: doc._id }, {
        action: 'delete parcel',
        message: 'You should rather archive it',
      });
    },
  },
};

//-----------------------------------------------

function onJoinParcelInsertSuccess(parcelId) {
  const communityId = FlowRouter.current().params._cid;
  const communityName = Communities.findOne(communityId).name;
  Memberships.methods.insert.call({
    person: { userId: Meteor.userId() },
    communityId,
    approved: false,  // any user can submit not-yet-approved memberships
    role: 'owner',
    parcelId,
    ownership: {
      share: new Fraction(1),
    },
  }, (err, res) => {
    if (err) displayError(err);
    else displayMessage('success', 'Join request submitted', communityName);
    Meteor.setTimeout(() => Modal.show('Modal', {
      title: __('Join request submitted', communityName),
      text: __('Join request notification'),
      btnOK: 'ok',
      //      btnClose: 'cancel',
      onOK() { FlowRouter.go('App home'); },
      //      onClose() { removeMembership.call({ _id: res }); }, -- has no permission to do it, right now
    }), 3000);
  });
}

AutoForm.addModalHooks('af.parcel.insert');
AutoForm.addModalHooks('af.parcel.update');
AutoForm.addHooks('af.parcel.insert', {
  formToDoc(doc) {
    doc.communityId = getActiveCommunityId();
    return doc;
  },
});
AutoForm.addHooks('af.parcel.update', {
  formToModifier(modifier) {
    modifier.$set.approved = true;
    return modifier;
  },
});

AutoForm.addModalHooks('af.parcel.insert.unapproved');
AutoForm.addHooks('af.parcel.insert.unapproved', {
  formToDoc(doc) {
    doc.communityId = getActiveCommunityId();
    doc.approved = false;
    return doc;
  },
  onSuccess(formType, result) {
    onJoinParcelInsertSuccess(result);
  },
});
