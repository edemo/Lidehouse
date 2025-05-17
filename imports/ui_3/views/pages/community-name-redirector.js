import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Communities } from '/imports/api/communities/communities.js';
import './community-name-redirector.html';

Template.Community_name_redirector.onCreated(() => {
  Template.instance().subscribe('communities.listing');
  const name = FlowRouter.getParam('_cname');
  Template.instance().autorun(() => {
    if (Template.instance().subscriptionsReady()) {
      const firstChar = name.charAt(0);
      const nameExp = `^[${firstChar.toUpperCase()}${firstChar.toLowerCase()}]${name.slice(1)}`;
      const community = Communities.findOne({ name: new RegExp(nameExp) });
      if (community) {
        FlowRouter.go('Community show', { _cid: community._id });
      } else {
        FlowRouter.go('Not found');
      }
    }
  });
});
