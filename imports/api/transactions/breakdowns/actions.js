import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import { Breakdowns } from './breakdowns.js';
import './methods.js';

export function allBreakdownsActions() {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  Breakdowns.actions = Breakdowns.actions || {
    collection: Breakdowns,
    new: {
      name: 'new',
      icon: 'fa fa-plus',
      permission: user.hasPermission('breakdowns.insert', communityId),
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
      icon: 'fa fa-eye',
      permission: user.hasPermission('breakdowns.inCommunity', communityId),
      run(id) {
        const breakdown = Breakdowns.findOne(id);
        const modalContext = {
          title: 'View Breakdown',
          body: 'Nestable_edit',
          bodyContext: { json: breakdown, disabled: true },
        };
        Modal.show('Modal', modalContext);
      },
      run_autoForm(id) {
        Modal.show('Autoform_edit', {
          id: 'af.breakdown.view',
          collection: Breakdowns,
          doc: Breakdowns.findOne(id),
          type: 'readonly',
        });
      },
    },
    edit: {
      name: 'edit',
      icon: 'fa fa-pencil',
      permission: user.hasPermission('breakdowns.update', communityId),
      run(id) {
        Modal.show('Autoform_edit', {
          id: 'af.breakdown.update',
          collection: Breakdowns,
          doc: Breakdowns.findOne(id),
          type: 'method-update',
          meteormethod: 'breakdowns.update',
          singleMethodArgument: true,
        });
      },
      run_nestable(id) {
        const breakdown = Breakdowns.findOne(id);
        const modalContext = {
          title: 'Edit Breakdown',
          body: 'Nestable_edit',
          bodyContext: { json: breakdown },
          btnClose: 'cancel',
          btnOK: 'save',
          onOK() {
            const json = serializeNestable();
            // console.log('saving nestable:', JSON.stringify(json));
            // assert json.length === 1
            // assert json[0].name === breakdown.name
            // assert locked elements are still there 
            Breakdowns.update(id, { $set: { children: json[0].children } },
              onSuccess(res => displayMessage('success', 'Breakdown saved'))
            );
          },
        };
        Modal.show('Modal', modalContext);
      },
    },
    delete: {
      name: 'delete',
      icon: 'fa fa-trash',
      permission: user.hasPermission('breakdowns.remove', communityId),
      run(id) {
        Modal.confirmAndCall(Breakdowns.remove, { _id: id }, {
          action: 'delete breakdown',
        });
      },
    },
  };
  return Breakdowns.actions;
}

export function getBreakdownsActionsSmall() {
  allBreakdownsActions();
  const actions = [
    Breakdowns.actions.view,
    Breakdowns.actions.edit,
    Breakdowns.actions.delete,
  ];
  return actions;
}

AutoForm.addModalHooks('af.breakdown.insert');
AutoForm.addModalHooks('af.breakdown.update');

AutoForm.addHooks('af.breakdown.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
