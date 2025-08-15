import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Recognitions } from './recognitions.js';
import '/imports/ui_3/views/components/doc-view.js';

Recognitions.actions = {
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('statements.reconcile', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.recognition.view',
        collection: Recognitions,
        fields: ['names'],
        doc,
        type: 'readonly',
      });
//      Modal.show('Modal', {
//        title: __('schemaStatementEntries.original.label'),
//        body: 'Doc_view',
//        bodyContext: { doc: doc.names },
//      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('statements.reconcile', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.recognition.edit',
        collection: Recognitions,
        fields: ['names'],
        doc,
        type: 'update',
      });
    },
  }),
};

//--------------------------------------------------------

JSON.parseAndFix = function parseAndFix(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    debugAssert(e instanceof SyntaxError);
    alert(__('Not a valid json'));
    return text;
  }
  return json;
};

AutoForm.addModalHooks('af.recognition.view');
AutoForm.addModalHooks('af.recognition.edit');

AutoForm.addHooks(['af.recognition.view', 'af.recognition.edit'], {
  formToDoc(doc) {
    if (doc.names) doc.names = JSON.parseAndFix(doc.names);
    return doc;
  },
  docToForm(doc) {
    if (doc.names) doc.names = JSON.stringify(doc.names || {}, null, 2);
    return doc;
  },
  formToModifier(modifier) {
    if (modifier.$set.names) modifier.$set.names = JSON.parseAndFix(modifier.$set.names);
    return modifier;
  },
});
