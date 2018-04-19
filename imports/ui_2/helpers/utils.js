import { Template } from 'meteor/templating';
import { moment } from 'meteor/momentjs:moment';

Template.registerHelper('percentage', function percentage(number) {
    return (Math.floor(number * 100)).toString() + '%';
});

Template.registerHelper('currentTime', function currentTime() {
    return moment().format('L LT');
});

// Takes any number of arguments and returns them concatenated.
Template.registerHelper('concat', function concat() {
    return Array.prototype.slice.call(arguments, 0, -1).join('');
});
