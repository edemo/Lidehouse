import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './badge.html';

Template.Badge.viewmodel({
  parentSubscriptionsReady() {
    return Template.instance().parent(1).subscriptionsReady();
  },
});
