import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import './menu-overflow-guard.html';

Template.Menu_overflow_guard.onRendered(function() {
  if ($('.dropdown').parents('.table-responsive').length > 0) {
    $('.dropdown').on('show.bs.dropdown', function () {
      const thisDropdown = $(this);
      $('body').append(thisDropdown.addClass('body-appended')
        .css({ position: "absolute", left: thisDropdown.offset().left, top: thisDropdown.offset().top }));
    });
    $('.dropdown').on('hidden.bs.dropdown', function () {
      const thisDropdown = $(this);
      const originalParent = '#container-' + this.id;
      $(originalParent).append(thisDropdown.removeClass('body-appended')
        .css({ position: "relative", left: "auto", top: "auto" }));
    });
  }
});

Template.Menu_overflow_guard.onDestroyed(function() {
  $('.dropdown.body-appended').remove();
});
