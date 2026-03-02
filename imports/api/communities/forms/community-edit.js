import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { Communities } from '/imports/api/communities/communities.js';

import './community-edit.html';

Template.Community_edit.onCreated(function () {
});

Template.Community_edit.onRendered(function () {
});

function keysFromSchema(schema) {
  return schema._schemaKeys
    .filter(key => schema._schema[key].autoform?.omit !== true && !key.includes('.'));
}

Template.Community_edit.helpers({
  baseFields() {
    return keysFromSchema(Communities.baseSchema);
  },
  settingsFields() {
    let result = keysFromSchema(Communities.genericSettingsSchema).map(key => `settings.${key}`);
    if (AutoForm.getFieldValue('settings.modules').includes('finances')) {
      result = result.concat(keysFromSchema(Communities.financesSettingsSchema).map(key => `settings.${key}`));
    }
    if (AutoForm.getFieldValue('settings.modules').includes('marketplace')) {
      result = result.concat(keysFromSchema(Communities.marketplaceSettingsSchema).map(key => `settings.${key}`));
    }
    return result;
  },
});

Template.Community_edit.events({
});
