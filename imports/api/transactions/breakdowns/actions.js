import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Breakdowns } from './breakdowns.js';
import './methods.js';

Breakdowns.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('breakdowns.insert'),
    run() {
      Modal.show('Autoform_edit', {
        id: 'af.breakdown.insert',
        collection: Breakdowns,
        type: 'insert',
        //      type: 'method',
    //      meteormethod: 'breakdowns.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('breakdowns.inCommunity'),
    run(data, doc) {
      const modalContext = {
        title: 'View Breakdown',
        body: 'Nestable_edit',
        bodyContext: { json: doc, disabled: true },
      };
      Modal.show('Modal', modalContext);
    },
    run_autoForm(data, doc) {
      Modal.show('Autoform_edit', {
        id: 'af.breakdown.view',
        collection: Breakdowns,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('breakdowns.update'),
    run(data, doc) {
      Modal.show('Autoform_edit', {
        id: 'af.breakdown.update',
        collection: Breakdowns,
        doc,
        type: 'method-update',
        meteormethod: 'breakdowns.update',
        singleMethodArgument: true,
      });
    },
    run_nestable(data, doc) {
      const modalContext = {
        title: 'Edit Breakdown',
        body: 'Nestable_edit',
        bodyContext: { json: doc },
        btnClose: 'cancel',
        btnOK: 'save',
        onOK() {
          const json = serializeNestable();
          // console.log('saving nestable:', JSON.stringify(json));
          // assert json.length === 1
          // assert json[0].name === breakdown.name
          // assert locked elements are still there 
          Breakdowns.update(data._id, { $set: { children: json[0].children } },
            onSuccess(res => displayMessage('success', 'Breakdown saved'))
          );
        },
      };
      Modal.show('Modal', modalContext);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: () => currentUserHasPermission('breakdowns.remove'),
    run(data) {
      Modal.confirmAndCall(Breakdowns.remove, { _id: data._id }, {
        action: 'delete breakdown',
      });
    },
  },
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.breakdown.insert');
AutoForm.addModalHooks('af.breakdown.update');

AutoForm.addHooks('af.breakdown.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
