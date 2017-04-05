import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';

import './communities-create-page.html';

Template.Communities_create_page.helpers({
  communities() {
    return Communities;
  },
});
