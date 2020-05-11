import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { __ } from '/imports/localization/i18n.js';
import './help-icon.html';

Template.Help_icon.onRendered(function () {
//  this.$('.help-icon').tooltip();
});

/* export function initializeHelpIcons(template, schemaName) {
  const helpIcons = template.$('.help-icon');
  helpIcons.each(function () {
    const helpIcon = $(this);
    const fieldName = helpIcon.data('name');
    const helpTextKey = `${schemaName}.${fieldName}.help`;
    const helpTextValue = __(helpTextKey);
    if (helpTextValue !== helpTextKey) {
      helpIcon.attr('title', helpTextValue);
//      helpIcon.data('original-title', helpTextValue);
      helpIcon.toggleClass('hidden');
    }
  });
} */
