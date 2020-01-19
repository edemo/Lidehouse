import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { Communities } from '/imports/api/communities/communities.js';

export const Generic_Layout = {
  name: 'Generic_Layout',
  path: 'email/generic-layout.html',   // Relative to 'private' dir.
  css: 'email/style.css',
  helpers: {
  },
};
