import { Template } from 'meteor/templating';
import './page-heading.html';

Template.Page_heading.helpers({
    // Route for Home link in breadcrumbs
    home: 'pageOne',
});
