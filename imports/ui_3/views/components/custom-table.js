import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import './custom-table.html';

Template.Custom_table.onCreated(function financesOnCreated() {
});

Template.Custom_table.helpers({
  timestamp() {
    return moment().format('L');
  },
  render(elem) {
    return __(elem.value);
  },
});

