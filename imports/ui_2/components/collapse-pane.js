import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './collapse-pane.html';

Template.Collapse_pane.onCreated(function collapsePaneOnCreated() {
});

Template.Collapse_pane.helpers({
  notFirstClassHeader() {
    return this.notFirst ? 'section-btn-notfirst' : '';
  },
  collapsedClassHeader() {
    return this.collapsed ? 'collapsed' : '';
  },
  collapsableDirectiveHeader() {
    return this.uncollapsable ? {} : { 'data-toggle': 'collapse' };
  },
  collapsedClassBody() {
    return this.collapsed ? '' : 'in';
  },
});

Template.Collapse_pane.events({
});
