import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import './active-archive-tabs.html';

function extendSelector(content, extensionObject) {
  const extendedSelector = _.extend({}, content.selector, extensionObject);
  return _.extend({}, content, { selector: extendedSelector });
}

Template.Active_archive_tabs.viewmodel({
  activeOrApproved() {
    if (this.hasTab('unapproved')) return __('Approved');
    return __('active').capitalize();
  },
  hasTab(tabType) {
    const tabs = this.templateInstance.data.tabs;
    if (!tabs) return true;
    const split = tabs.split(',');
    return _.contains(split, tabType);
  },
  selectorExtension(tabType) {
    let extension;
    switch (tabType) {
      case 'active': extension = { active: true, approved: true }; break;
      case 'unapproved': extension = { active: true, approved: false }; break;
      case 'archived': extension = { active: false }; break;
      default: debugAssert(false); return undefined;
    }
    if (!this.hasTab('unapproved')) delete extension.approved;
    if (!this.hasTab('archived')) delete extension.active;
    return extension;
  },
  extendedData(tabType) {
    return extendSelector(this.templateInstance.data.content, this.selectorExtension(tabType));
  },
  count(tabType) {
    const collection = Mongo.Collection.get(this.templateInstance.data.content.collection);
    const selector = _.extend({}, this.templateInstance.data.content.selector, this.selectorExtension(tabType));
    return collection.find(selector).count();
  },
});
