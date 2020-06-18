import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';

// This is how we did it, before multi modals
export function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

export let ModalStack = {};

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { resetSession } from '/imports/startup/client/session.js';

  // Set up peppelg:bootstrap-3-modal to allow multiple modals
  Modal.allowMultiple = true;

  // ModalStack data structure:
  // [{ id:'af.object.action', result: { id1: result1, id2: result2 } }]

  ModalStack = {
    contextForTheNext: {},
    get() {
      let modalStack = Session.get('modalStack');
      if (!modalStack) {
        resetSession();
        modalStack = Session.get('modalStack');
      }
      return modalStack;
    },
    push(dataId) { // called upon Modal.show();
      const modalStack = ModalStack.get();
      // console.log('before push:', modalStack);
      modalStack.push({ id: dataId, result: {}, context: ModalStack.contextForTheNext });
      // console.log('after push:', modalStack);
      Session.set('modalStack', modalStack);
      ModalStack.contextForTheNext = {};
    },
    pop(dataId) { // called upon Modal.hide();
      const modalStack = ModalStack.get();
      // console.log('before pop:', modalStack);
      const topModal = modalStack.pop();
      debugAssert((!topModal.id && !dataId) || topModal.id === dataId);
      // console.log('after pop:', modalStack);
      Session.set('modalStack', modalStack);
      if (modalStack.length > 1) $('body').addClass('modal-open');
    },
    active() {
      const modalStack = ModalStack.get();
      return (modalStack.length > 1) && _.last(modalStack);
    },
    height() {
      const modalStack = ModalStack.get();
      return modalStack.length - 1;
    },
    recordResult(afId, result) {
      const modalStack = ModalStack.get();
      if (modalStack.length <= 1) return; // If there is no modal, no need to pass on the result
      modalStack[modalStack.length - 2].result[afId] = result;
      Session.set('modalStack', modalStack);
    },
    readResult(ownId, afId) {
      const modalStack = ModalStack.get();
      // console.log('before read', modalStack);
      let ownModal = {};
      ownModal = _.find(modalStack, modal => (modal.id === ownId));
      // console.log('ownModal:', ownModal);
      // console.log('returns:', ownModal?.result[afId]);
      return ownModal?.result[afId];
    },
    setVar(key, value, keep = false) { // Should not call this within an autorun - would cause infinite loop
      const modalStack = ModalStack.get();
      // console.log('before set', modalStack);
      // console.log('set value', value);
      if (keep) { // keep sets it for this level
        _.last(modalStack).context[key] = value;
        Session.set('modalStack', modalStack);
      } else { // no keep sets it only for the next level
        ModalStack.contextForTheNext[key] = value;
      }
      // console.log('after set', modalStack);
    },
    getVar(key) {
      const modalStack = ModalStack.get();
      // console.log('before get', modalStack);
      for (let i = modalStack.length - 1; i >= 0; i--) {
        const value = modalStack[i].context[key];
        if (value) return value;
      }
      return undefined;
    },
/*    setCallback(callback) {
      const modalStack = ModalStack.get();
      _.last(modalStack).callback = callback;
      Session.set('modalStack', modalStack);
    },
    getCallback() {
      const modalStack = ModalStack.get();
      return _.last(modalStack).callback;
    },*/
  };
}
