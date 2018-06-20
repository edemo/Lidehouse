import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';
import { Session } from 'meteor/session';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { __ } from '/imports/localization/i18n.js';
import { _ } from 'meteor/underscore';
import { descartesProduct } from '/imports/utils/descartes.js';
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

