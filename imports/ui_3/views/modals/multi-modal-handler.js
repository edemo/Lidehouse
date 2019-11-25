import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { debugAssert } from '/imports/utils/assert.js';

import './multi-modal-handler.html';

Modal.allowMultiple = true;

// [{ id:'', result: { id1: result1, id2: result2 } }]

export const ModalStack = {
  push(dataId) {
    if (!Session.get('modalStack')) Session.set('modalStack', []);
    const modalStack = Session.get('modalStack');
    modalStack.push({ id: dataId, result: {} });
    Session.set('modalStack', modalStack);
  },
  pop(dataId) {
    const modalStack = Session.get('modalStack');
    const topModal = modalStack.pop();
    debugAssert((!topModal.id && !dataId) || topModal.id === dataId);
    if (modalStack.length > 0) $('body').addClass('modal-open');
    Session.set('modalStack', modalStack);
    // Modal.hide();
  },
  active() {
    const modalStack = Session.get('modalStack');
    return _.last(modalStack);
  },
  recordResult(afId, result) {
    const modalStack = Session.get('modalStack');
    modalStack[modalStack.length - 2].result[afId] = result;
    Session.set('modalStack', modalStack);
  },
  readResult(ownId, afId) {
    const modalStack = Session.get('modalStack');
    let ownModal = {};
    ownModal = _.find(modalStack, modal => (modal.id === ownId));
    return ownModal.result[afId];
  },
};

Template.Multi_modal_handler.onCreated(function () {
  const dataId = this.parent().data.id;
  ModalStack.push(dataId);
});

Template.Multi_modal_handler.onDestroyed(function () {
  const dataId = this.parent().data.id;
  ModalStack.pop(dataId);
});
