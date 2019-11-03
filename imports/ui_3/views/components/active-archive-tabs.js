import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import './active-archive-tabs.html';

Template.Active_archive_tabs.helpers({
  dataActiveTrue() {
    return _.extend(this.content, { active: true });
  },
  dataActiveFalse() {
    return _.extend(this.content, { active: false });
  },
});
