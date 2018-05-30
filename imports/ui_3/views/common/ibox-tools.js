import { Template } from 'meteor/templating';
import './ibox-tools.html';

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
