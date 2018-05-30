import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './collapse-section.html';

Template.Collapse_section.onCreated(function collapseSectionOnCreated() {
});

Template.Collapse_section.helpers({
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

Template.Collapse_section.events({
});
