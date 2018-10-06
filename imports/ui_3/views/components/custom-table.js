import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import './custom-table.html';

Template.Custom_table.onCreated(function financesOnCreated() {
});

Template.Custom_table.helpers({
  timestamp() {
    return moment().format('L');
  },
});

