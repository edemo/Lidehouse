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
