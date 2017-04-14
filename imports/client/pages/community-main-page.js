
import { Template } from 'meteor/templating';
import { CommunityMembers } from '/imports/api/views/community-members.js';
import { AutoForm } from 'meteor/aldeed:autoform';

import './community-main-page.html';

Template.Community_main_page.helpers({
  communityMembers() {
    return CommunityMembers;
  },
});
