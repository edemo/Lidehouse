import { Meteor } from 'meteor/meteor';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Shareddocs } from './shareddocs.js';
import './methods.js';

Shareddocs.actions = {
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('shareddocs.remove', doc),
    run(event, instance) {
      Modal.confirmAndCall(Shareddocs.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'shareddoc',
        message: 'It will disappear forever',
      });
    },
  }),
};
