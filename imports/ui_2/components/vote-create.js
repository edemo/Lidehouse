import { Template } from 'meteor/templating';

import './vote-create.html';

Template.Vote_create.onCreated(function voteCreateOnCreated() {
});

Template.Vote_create.events({
  'click .js-answer, click .js-add-answer'(event) {
    $('.choice-form')[0].classList.toggle('hidden');
    $('.js-answer')[0].classList.toggle('hidden');
  },
  'click .js-new-vote, click .js-vote-nope'(event) {
    $('.js-new-vote')[0].classList.toggle('hidden');
  },
});
