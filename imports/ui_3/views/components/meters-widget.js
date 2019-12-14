import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';

import './meters-widget.html';

Template.Meters_widget.viewmodel({
  autorun() {
    const communityId = Session.get('activeCommunityId');
    this.templateInstance.subscribe('meters.inCommunity', { communityId });
  },
  ownedParcels() {
    const user = Meteor.user();
    const communityId = Session.get('activeCommunityId');
    if (!user || !communityId) return [];
    return user.ownedParcels(communityId);
  },
  lastReadingDate() {
    const meters = this.ownedParcels().fetch()[0].meters().fetch();
    const meter = meters[0];
    return meter ? meter.lastReading().date : undefined;
  },
  colorClass(date) {
    if (!date) return 'bg-danger';
    const elapsedDays = moment().diff(moment(date), 'days');
    if (elapsedDays > 90) return 'bg-warning';
    return 'navy-bg';
  },
  icon() {
    return 'fa fa-tachometer';
  },
  message() {
    return 'Message';
  },
});

