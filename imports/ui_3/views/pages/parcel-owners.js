
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { __ } from '/imports/localization/i18n.js';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '../common/page-heading.js';
import '../components/action-buttons.html';
import './parcel-owners.html';

Template.Parcel_owners_page.onCreated(function () {
});

Template.Parcel_owners_page.onRendered(function () {
});

Template.Parcel_owners_page.helpers({
  pageCrumbs() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel && parcel.communityId;
    return [{
      title: __('Community page'),
      url: FlowRouter.path('Community.page', { _cid: communityId }),
    }];
  },
  title() {
    return `${__('parcel')} ${__("'s owners")}`;
  },
  smallTitle() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    return parcel ? `${parcel.display()} ${__("'s owners")}` : __('unknown');
  },
});

Template.Parcel_owners_page.events({
});