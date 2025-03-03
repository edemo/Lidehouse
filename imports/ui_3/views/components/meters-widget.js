import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunity, getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

import './meters-widget.html';

Template.Meters_widget.viewmodel({
  relevantParcels() {
    const user = Meteor.user();
    const community = getActiveCommunity();
    const communityId = community?._id;
    if (!user || !communityId) return [];
    return Parcels.find({ communityId, category: community.propertyCategory() }).fetch().filter(p => user.hasPermission('parcels.finances', p));
  },
  oldestReadMeter() {
    const meter = _.sortBy(this.relevantParcels().map(p => p.oldestReadMeter()), m => m?.lastReadingDate().getTime())[0];
    return meter;
  },
  lastReadingDate() {
    const meter = this.oldestReadMeter();
    return meter && meter.lastReading().date;
  },
  colorClass() {
    const meter = this.oldestReadMeter();
    const color = meter && meter.lastReadingColor();
    return color ? 'bg-' + color : 'navy-bg';
  },
  icon() {
    return 'fa fa-tachometer';
  },
  message() {
    return 'Message';
  },
});

Template.Meters_widget.events({
  'click .js-meters'(event, instance) {
    const community = getActiveCommunity();
    const communityId = community._id;
    const user = Meteor.user();
    const parcels = instance.viewmodel.relevantParcels();
    Modal.show('Modal', {
      id: 'meters.view',
      title: __('meters'),
      body: 'Meters_box',
      bodyContext: {
        community,
        parcels,
      },
      size: user.hasPermission('meters.update', { communityId }) ? 'lg' : 'md',
    });
  },
});
