import { Template } from 'meteor/templating';

Template.registerHelper('percentage', function percentage(number) {
  return (Math.floor(number * 100)).toString() + '%';
});
