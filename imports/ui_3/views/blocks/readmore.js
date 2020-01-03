import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import './readmore.html';

Template.Readmore.events({
  'click .read-more'(event) {
    event.preventDefault();
    $(event.target).closest('div').find('.more-text').show();
    $(event.target).closest('p').hide();
  },
});
