/* global alert */

import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';

export function afCommunityInsertModal() {
  Modal.show('Autoform_edit', {
    id: 'af.community.insert',
    collection: Communities,
    omitFields: ['description'],
    type: 'method',
    meteormethod: 'communities.create',
    template: 'bootstrap3-inline',
  });
}

export function afCommunityUpdateModal() {
  Modal.show('Autoform_edit', {
    id: 'af.community.update',
    collection: Communities,
    doc: Communities.findOne(Template.instance().getCommunityId()),
    omitFields: ['description'],
    type: 'method-update',
    meteormethod: 'communities.update',
    singleMethodArgument: true,
    template: 'bootstrap3-inline',
  });
}

AutoForm.addModalHooks('af.community.insert');
AutoForm.addModalHooks('af.community.update');
