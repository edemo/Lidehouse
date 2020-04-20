import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './badge.html';

Template.Badge.viewmodel({
  parentSubscriptionsReady() {
    // unfortunately this does not work in tables
    return Template.instance().parent(1).subscriptionsReady();
  },
  extraClasses() {
    return this.templateInstance.data.class;
  },
});
