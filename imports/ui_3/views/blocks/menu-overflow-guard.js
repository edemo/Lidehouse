import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Random } from 'meteor/random';
import './menu-overflow-guard.html';

const overflowProblemCausingElement = '.table-responsive';

Template.Menu_overflow_guard.onRendered(function() {
  const relatedDropdown = this.parent().$('.dropdown');
  if (relatedDropdown.parents(overflowProblemCausingElement).length > 0) {
    relatedDropdown.on('show.bs.dropdown', function (e) {
      const dropdownMenu = $(e.target).find('.dropdown-menu');
      const left = e.target.getBoundingClientRect().left + window.scrollX + $(e.target).width() - dropdownMenu.width();
      const top = e.target.getBoundingClientRect().top + window.scrollY + 8;
      $('body').append(dropdownMenu.addClass('body-appended').css({ display: 'block', right: 'auto' }));
      dropdownMenu.offset({ left, top });
      $(this).on('hidden.bs.dropdown', function () {
        dropdownMenu.appendTo(e.target).css({ display: 'none' });
      });
    });
  }
});

Template.Menu_overflow_guard.onDestroyed(function() {
  $('.dropdown-menu.body-appended').remove();
});
