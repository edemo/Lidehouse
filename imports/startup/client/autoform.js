import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import './autoform.html';

Template['afFormGroup_bootstrap3-help'].onRendered(function() {
  //debugger;
  //this.$("[data-toggle=tooltip]").tooltip();
});

Template['afFormGroup_bootstrap3-help'].helpers({
  afFieldInputAtts() {
    const atts = _.clone(this.afFieldInputAtts || {});
    // Use the same templates as those defined for bootstrap3 template.
    atts.template = 'bootstrap3';
    return atts;
  },
});

AutoForm.setDefaultTemplateForType('afFormGroup', 'bootstrap3-help');
