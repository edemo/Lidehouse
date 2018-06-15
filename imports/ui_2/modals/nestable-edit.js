/* global alert */
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';

import 'nestable';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import './nestable-edit.html';

export function serializeNestable() {
  const jq = $('#nestable');
  const json = jq.nestable('serialize');
  return json;
}

Template.Nestable_edit.onCreated(function () {
});

Template.Nestable_edit.onRendered(function () {
  $(this.find('#nestable')).nestable({ maxDepth: 4 });
  /*
    .on('change', function (event) {
      event.preventDefault();
      console.log("onChange");
    });
    */
});

Template.Nestable_edit.helpers({
  displaySerializedVersion() {
    const json = serializeNestable();
    return JSON.stringify(json);
  },
});
