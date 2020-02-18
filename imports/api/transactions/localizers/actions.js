import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Localizers } from './localizers.js';
import './entities.js';
import './methods.js';

Localizers.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('localizers.insert', doc),
    run(options, doc) {
      const entityName = doc.entityName();
      const entity = Localizers.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${options.entity.name}.insert`,
        schema: options.entity.schema,
        type: 'method',
        meteormethod: 'localizers.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('localizers.inCommunity', doc),
    run(options, doc) {
      const entityName = doc.entityName();
      const entity = Localizers.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${entityName}.view`,
        schema: Localizers.simpleSchema(doc),
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('localizers.update', doc),
    run(options, doc) {
      const entityName = doc.entityName();
      const entity = Localizers.entities[entityName];
      Modal.show('Autoform_modal', {
        id: `af.${entityName}.update`,
        schema: Localizers.simpleSchema(doc),
        doc,
        type: 'method-update',
        meteormethod: 'localizers.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('localizers.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Localizers.methods.remove, { _id: doc._id }, {
        action: 'delete localizer',
        message: 'Some accounting transactions might be connecting to it',
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.@group.insert');
AutoForm.addModalHooks('af.@group.update');
AutoForm.addHooks('af.@group.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = '@group';
    return doc;
  },
});

AutoForm.addModalHooks('af.#tag.insert');
AutoForm.addModalHooks('af.#tag.update');
AutoForm.addHooks('af.#tag.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = '#tag';
    return doc;
  },
});
