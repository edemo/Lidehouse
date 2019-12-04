import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { debugAssert } from '/imports/utils/assert.js';

import './multi-modal-handler.html';

// This is how we did it, before multi modals
export function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

// For storing multiple key-values within a single session var 
// (BEWARE infinite reactive update loops -> Never call it from within an autorun!!!)
Session.update = function update(sessionVarName, key, value) {
  const sessionVar = Session.get(sessionVarName) || {};
  sessionVar[key] = value;
  Session.set(sessionVarName, sessionVar);
};

// --- --- --- --- --- --- --- --- --- --- --- --- ---

// Set up peppelg:bootstrap-3-modal to allow multiple modals
Modal.allowMultiple = true;

// ModalStack data structure:
// [{ id:'af.object.action', result: { id1: result1, id2: result2 } }]

export const ModalStack = {
  constructor() {
    Session.set('modalContext', {});  // init to empty
  },
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
    Session.set('modalStack', modalStack);
    if (modalStack.length > 0) $('body').addClass('modal-open');
    else Session.set('modalContext', {}); // clean context up after last modal
    // Modal.hide();  // not necessary
  },
  active() {
    const modalStack = Session.get('modalStack');
    return _.last(modalStack);
  },
  recordResult(afId, result) {
    const modalStack = Session.get('modalStack');
    if (modalStack.length <= 1) return;   // If this was the bottomest modal, no need to pass on the result, we can clean up
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
