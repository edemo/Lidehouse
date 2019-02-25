import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';

import './revision-history.html';

Template.Revision_history.helpers({
  revision(doc) {
    return doc.revision;
  },
  sortedRevisions(doc) {
    return _.sortBy(doc.revision, 'time').reverse();
  },
  translateFieldName(schemaName, field) {
    const fieldName = schemaName + '.' + field + '.label';
    return `"${__(fieldName)}"`;
  },
  translateFieldValue(schemaName, field, value) {
    const schemaFieldValue = schemaName + '.' + field + '.' + value.split(':')[0];  // tap-i18n stops at colon
    if (__(schemaFieldValue) !== schemaFieldValue) return __(schemaFieldValue);
    return value;
  },

});

Template.Revision_history.events({

});
