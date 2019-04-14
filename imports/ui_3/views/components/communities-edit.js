/* global alert */

import { Template } from 'meteor/templating';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';

export function afCommunityInsertModal() {
  Modal.show('Autoform_edit', {
    id: 'af.community.insert',
    collection: Communities,
    omitFields: ['description', 'parcels'],
    type: 'method',
    meteormethod: 'communities.create',
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
  });
}

AutoForm.addModalHooks('af.community.insert');
AutoForm.addModalHooks('af.community.update');
