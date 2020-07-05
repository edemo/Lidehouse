import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import '/imports/ui_3/views/blocks/help-icon.js';
import './autoform-config.html';

Template['afFormGroup_bootstrap3-help'].helpers({
  afFieldInputAtts() {
    const atts = _.clone(this.afFieldInputAtts || {});
    // Use the same templates as those defined for bootstrap3 template.
    atts.template = 'bootstrap3';
    return atts;
  },
});

AutoForm.setDefaultTemplateForType('afFormGroup', 'bootstrap3-help');

// On forms, the enter key should NOT submit the form
// best would be if Return worked as a TAB btn, but if that cannot be done, let's supress it altogether
// http://webcheatsheet.com/javascript/disable_enter_key.php
function stopEnterKey(event) {
  const node = event.target || (event.srcElement) || null;
  if ((event.keyCode == 13) && (node.type == 'text' || node.type == 'number')) return false;
}

Meteor.startup(() => document.onkeypress = stopEnterKey);
