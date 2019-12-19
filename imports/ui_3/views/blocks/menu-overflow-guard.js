import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Random } from 'meteor/random';
import './menu-overflow-guard.html';

const overflowProblemCausingElement = '.table-responsive';

Template.Menu_overflow_guard.onRendered(function() {
  const relatedDropdown = this.parent().$('.dropdown');
  if (relatedDropdown.parents(overflowProblemCausingElement).length > 0) {
    const dropdownParent = Random.id();
    relatedDropdown.parent().addClass(dropdownParent);
    relatedDropdown.on('show.bs.dropdown', function () {
      const thisDropdown = $(this);
      $('body').append(thisDropdown.addClass('body-appended')
        .css({ position: "absolute", left: thisDropdown.offset().left, top: thisDropdown.offset().top }));
    });
    relatedDropdown.on('hidden.bs.dropdown', function () {
      const thisDropdown = $(this);
      const originalParent = '.' + dropdownParent;
      $(originalParent).append(thisDropdown.removeClass('body-appended')
        .css({ position: "relative", left: "auto", top: "auto" }));
    });
  }
});

Template.Menu_overflow_guard.onDestroyed(function() {
  $('.dropdown.body-appended').remove();
});
