import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import './meters-widget.html';

Template.Meters_widget.viewmodel({
  autorun() {
    const communityId = Session.get('activeCommunityId');
    this.templateInstance.subscribe('parcels.ofSelf', { communityId });
  },
  ownedParcels() {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    if (!user || !communityId) return [];
    return user.ownedParcels(communityId);
  },
  oldestReadMeter() {
    const meter = this.ownedParcels().map(p => p.oldestReadMeter()).sort(m => m.lastReading().date)[0];
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

