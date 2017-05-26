import { Template } from 'meteor/templating';

import '../components/comments-section.html';

Template.Comments_section.onRendered(function commentsSectionOnRendered() {
});

Template.Comments_section.events({
  'click .accordion-comment'(event) {
    const accordion = event.target;
    accordion.classList.toggle('active');
    const content = accordion.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  },
});
