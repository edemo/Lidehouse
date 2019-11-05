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
    if (this.templateInstance.data.unapprovedTab) return __('Approved');
    return __('Active');
  },
  selectorExtension(tabType) {
    switch (tabType) {
      case 'active': return this.templateInstance.data.unapprovedTab ? { approved: true, active: true } : { active: true };
      case 'unapproved': return { active: true, approved: false };
      case 'archived': return { active: false };
      default: debugAssert(false); return undefined;
    }
  },
  extendedData(tabType) {
    return extendSelector(this.templateInstance.data.content, this.selectorExtension(tabType));
  },
  count(tabType) {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const selector = _.extend({}, this.templateInstance.data.content.selector, this.selectorExtension(tabType));
    return collection.find(selector).count();
  },
});
