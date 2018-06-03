import { Template } from 'meteor/templating';

import './blank.html';

Template.Blank_layout.onRendered(function() {
    // Add gray color for background in blank layout
    $('body').addClass('gray-bg');
});

Template.Blank_layout.onDestroyed(function() {
    // Remove special color for blank layout
    $('body').removeClass('gray-bg');
});
