import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Topics } from './topics';
import './entities.js';
import './methods.js';

Topics.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (entityName) => currentUserHasPermission(`${entityName}.insert`),
    run(entityName) {
      const entity = Topics.entities[entityName];
      Modal.show(entity.form, {
        id: `af.${entityName}.insert`,
        collection: Topics,
        fields: entity.inputFields,
        omitFields: entity.omitFields,
        type: 'method',
        meteormethod: 'topics.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('topics.inCommunity'),
    href: (id) => `pathFor 'Topic show' _tid=${id}`,
    run(id, event, instance) {},
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(id) {
      const doc = Topics.findOne(id);
      return doc && currentUserHasPermission(`${doc.entityName()}.update`);
    },
    run(id, event, instance) {
      const doc = Topics.findOne(id);
      const entity = Topics.entities[doc.entityName()];
      Modal.show(entity.form, {
        id: `af.${doc.entityName()}.update`,
        collection: Topics,
        fields: entity.modifiableFields,
        omitFields: entity.omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'topics.update',
        singleMethodArgument: true,
      });
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible(id) {
      const doc = Topics.findOne(id);
      return doc && currentUserHasPermission(`${doc.entityName()}.remove`);
    },
    run(id, event, instance) {
      const doc = Topics.findOne(id);
      Modal.confirmAndCall(Topics.methods.remove, { _id: id }, {
        action: `delete ${doc.entityName()}`,
        message: 'It will disappear forever',
      });
    },
  },
};

//-------------------------------------------------------

_.each(Topics.entities, (entity, entityName) => {
  AutoForm.addModalHooks(`af.${entityName}.insert`);
  AutoForm.addModalHooks(`af.${entityName}.update`);

  AutoForm.addHooks(`af.${entityName}.insert`, {
    formToDoc(doc) {
      _.each(entity.implicitFields, (value, key) => {
        doc[key] = (typeof value === 'function') ? value() : value;
      });
      doc.status = Topics._transform(doc).startStatus().name;
      if (!doc.title && doc.text) {
        doc.title = (doc.text).substring(0, 25) + '...';
      }
      return doc;
    },
  });
});
