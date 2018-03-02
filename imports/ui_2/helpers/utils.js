import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';

Template.registerHelper('percentage', function percentage(number) {
  return (Math.floor(number * 100)).toString() + '%';
});

Template.registerHelper('currentTime', function currentTime() {
  return moment().format('L LT');
});
