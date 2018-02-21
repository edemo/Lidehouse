import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';

Template.registerHelper('afCurrentFieldValue', function (fieldName) {
  return AutoForm.getFieldValue(fieldName);
});
