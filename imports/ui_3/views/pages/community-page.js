import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Fraction } from 'fractional';

import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { __ } from '/imports/localization/i18n.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { leaderRoles, nonLeaderRoles, officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import '/imports/api/parcels/actions.js';
import { parcelColumns, highlightMyRow } from '/imports/api/parcels/tables.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/actions.js';
import { Leaderships } from '/imports/api/leaderships/leaderships.js';
import '/imports/api/leaderships/actions.js';
import { Meters } from '/imports/api/meters/meters.js';
import '/imports/api/meters/actions.js';
import '/imports/api/users/users.js';
import '/imports/ui_3/views/components/active-archive-tabs.js';
import '/imports/ui_3/views/blocks/simple-reactive-datatable.js';
import '/imports/ui_3/views/common/page-heading.js';
import '/imports/ui_3/views/components/action-buttons.html';
import '/imports/ui_3/views/components/contact-long.js';
import '/imports/ui_3/views/blocks/menu-overflow-guard.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import './community-page.html';

Template.Roleships_box.viewmodel({
  autorun() {
    const communityId = getActiveCommunityId();
    this.templateInstance.subscribe('memberships.inCommunity', { communityId });
  },
  leaders() {
    const communityId = getActiveCommunityId();
    return Memberships.findActive({ communityId, role: { $in: leaderRoles } }, { sort: { createdAt: 1 } }).fetch();
  },
  nonLeaders() {
    const communityId = getActiveCommunityId();
    return Memberships.findActive({ communityId, role: { $in: nonLeaderRoles } }, { sort: { createdAt: 1 } }).fetch();
  },
  officers() {
    const officers = this.leaders().concat(this.nonLeaders());
    officers.push(officers.shift());  // put admin from front to the end
    return officers;
  },
});

Template.Occupants_table.viewmodel({
  memberships() {
    const selector = this.templateInstance.data.selector;
    return Memberships.find(selector, { sort: { role: -1 } });
  },
  leaderships() {
    const selector = this.templateInstance.data.selector;
    return Leaderships.find(selector);
  },
});

Template.Occupants_box.viewmodel({
  membershipsContent() {
    const data = this.templateInstance.data;
    const communityId = getActiveCommunityId();
    const selector = { communityId, parcelId: data.parcelId };
    return { collection: 'memberships', selector };
  },
  parcelDisplay() {
    const parcelId = this.templateInstance.data.parcelId;
    const parcel = Parcels.findOne(parcelId);
    return parcel ? parcel.display() : __('unknown');
  },
  leadershipTitle() {
    const parcelId = this.templateInstance.data.parcelId;
    const leadership = Leaderships.findOne({ parcelId });
    return leadership ? ` - ${__('leadership')}` : '';
  },
});

Template.Meters_table.viewmodel({
  rows() {
    const selector = this.templateInstance.data.selector;
    return Meters.find(selector);
  },
});

Template.Meters_box.viewmodel({
  parcelDisplay() {
    const parcelId = this.templateInstance.data.parcelId;
    const parcel = Parcels.findOne(parcelId);
    return parcel ? parcel.display() : __('unknown');
  },
  metersContent() {
    const communityId = getActiveCommunityId();
    const parcelId = this.templateInstance.data.parcelId;
    const selector = { communityId, parcelId };
    return { collection: 'meters', selector };
  },
});

Template.Parcels_box.viewmodel({
  showAllParcels: false,
  onCreated() {
    const user = Meteor.user();
    const community = getActiveCommunity();
    const showAllParcelsDefault = (
      (user && user.hasPermission('parcels.insert', community._id))
      || (community && community.parcels.flat <= 25)
    );
    this.showAllParcels(!!showAllParcelsDefault);
  },
  autorun() {
    const communityId = getActiveCommunityId();
    this.templateInstance.subscribe('memberships.inCommunity', { communityId });
    this.templateInstance.subscribe('leaderships.inCommunity', { communityId });
    this.templateInstance.subscribe('meters.inCommunity', { communityId });
    if (this.showAllParcels()) {
      this.templateInstance.subscribe('parcels.inCommunity', { communityId });
    } else {
      this.templateInstance.subscribe('parcels.ofSelf', { communityId });
    }
  },
  parcelTypesWithCount() {
    const communityId = getActiveCommunity();
    const result = [];
    if (!community) return [];
    Object.keys(community.parcels).forEach(k => {
      result.push({ type: k, count: community.parcels[k] });
    });
    return result;
  },
  parcelsTableContent() {
    const self = this;
    const communityId = getActiveCommunityId();
    return {
      collection: 'parcels',
      selector: { communityId },
      options() {
        return () => {
          return {
            columns: parcelColumns(),
            createdRow: highlightMyRow,
            tableClasses: 'display',
            language: datatables_i18n[TAPi18n.getLanguage()],
            lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
            pageLength: 25,
            ...DatatablesExportButtons,
          };
        };
      },
    };
  },
  parcels() {
    const communityId = getActiveCommunityId();
    return Parcels.find({ communityId, approved: true });
  },
  unapprovedParcels() {
    const communityId = getActiveCommunityId();
    return Parcels.find({ communityId, approved: false });
  },
  unapprovedParcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = getActiveCommunityId();
      return Parcels.find({ communityId, approved: false }).fetch();
    };
  },
});

Template.Community_page.viewmodel({
  onRendered() {
    // Add slimscroll to element
    $('.full-height-scroll').slimscroll({
      height: '100%',
    });
  },
  autorun: [
    function subscription() {
      const communityId = getActiveCommunityId();
      this.templateInstance.subscribe('communities.byId', { _id: communityId });
    },
  ],
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return getActiveCommunity();
  },
  communities() {
    return Communities;
  },
  title() {
    const community = getActiveCommunity();
    return `${__('Community page')} - ${community ? community.name : ''}`;
  },
  /*  thingsToDisplayWithCounter() {
      const result = [];
      const communityId = Template.instance().getCommunityId();
      result.push({
        name: 'owner',
        count: Memberships.findActive({ communityId, role: 'owner' }).count(),
      });
      Parcels.typeValues.forEach(type =>
        result.push({
          name: type,
          count: Parcels.find({ communityId, type }).count(),
        })
      );
      return result;
    },*/
  activeTabClass(index) {
    return index === 0 ? 'active' : '';
  },
});

Template.Roleships_box.events({
  ...(actionHandlers(Memberships)),
});

Template.Occupants_box.events({
  ...(actionHandlers(Memberships)),
  ...(actionHandlers(Leaderships)),
  'click .js-member'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    const membership = Memberships.findOne(id);
    Modal.show('Modal', {
      title: 'User data page',
      body: 'Contact_long',
      bodyContext: membership.Person().user(),
    })
  },
});

Template.Meters_box.events({
  ...(actionHandlers(Meters)),
});

Template.Parcels_box.events({
  ...(actionHandlers(Parcels)),
  'click .parcels .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});

Template.Community_page.events({
  ...(actionHandlers(Communities)),
});
