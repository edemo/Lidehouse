import { Template } from 'meteor/templating';
import './ibox-tools.html';

Template.iboxTools.onRendered(function () {
  const element = this.$('.collapse-link');
  const ibox = element.closest('div.ibox');
  element.parent().css('position', 'relative');
  element.addClass('collapse-link-size');
  if (ibox.hasClass('closed-ibox')) {
    const button = element.closest('div.collapse-link').find('i');
    ibox.find('div.ibox-content').css('display', 'none');
    button.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    ibox.addClass('border-bottom');
  }
});

Template.iboxTools.events({
    'click .collapse-link'(event) {
        var element = $(event.target);
        var ibox = element.closest('div.ibox');
        var button = element.closest('div.collapse-link').find('i');
        var content = ibox.find('div.ibox-content');
        content.slideToggle(200);
        button.toggleClass('fa-chevron-up').toggleClass('fa-chevron-down');
        ibox.toggleClass('').toggleClass('border-bottom');
        setTimeout(function () {
            ibox.resize();
            ibox.find('[id^=map-]').resize();
        }, 50);
    },
    'click .close-link'(event) {
        var element = $(event.target);
        var content = element.closest('div.ibox');
        content.remove();
    },
});
