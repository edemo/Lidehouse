import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { AutoForm } from 'meteor/aldeed:autoform';

export function showWelcomeModal() {
  Modal.show('Autoform_edit', {
    id: 'af.welcome.update',
    title: 'Üdvözöljük a honline rendszerben. Kérjük adja meg alább a beállításait, valamint a profil oldalon a megfelelő adatokat. Beállításait később is módosíthatja a profil oldalon.',
    collection: Meteor.users,
    omitFields: ['username', 'emails', 'profile', 'avatar'],
    doc: Meteor.user(), 
    type: 'method-update',
    meteormethod: 'user.update',
    singleMethodArgument: true,
    template: 'bootstrap3-inline',
  });
  AutoForm.addModalHooks('af.welcome.update');
}
