import { Template } from 'meteor/templating';
import './page-heading.html';

Template.Page_heading.helpers({
    smallTitle() {
        return this.smallTitle || this.title;
    },
});
