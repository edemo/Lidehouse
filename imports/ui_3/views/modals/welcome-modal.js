import { Meteor } from 'meteor/meteor';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';

export function showWelcomeModal() {
  Modal.show('Autoform_modal', {
    id: 'af.settings.update',
    title: __('welcome'),
    description: __('welcomeMessage'),
    collection: Meteor.users,
    omitFields: ['username', 'emails', 'profile', 'avatar'],
    doc: Meteor.user(), 
    type: 'method-update',
    meteormethod: 'user.update',
    singleMethodArgument: true,
  });
}

AutoForm.addModalHooks('af.settings.update');
AutoForm.addHooks('af.settings.update', {
  docToForm(doc) {
    doc.settings.notiFrequency = 'weekly';
    return doc;
  },
});
