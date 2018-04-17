import { Template } from 'meteor/templating';
import './navigation.html';

Template.Navigation.onRendered = function() {
    // Initialize metisMenu
    $('#side-menu').metisMenu();
};
