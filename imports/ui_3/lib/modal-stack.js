import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';

// This is how we did it, before multi modals
export function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

export let ModalStack = {};

if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  // Set up peppelg:bootstrap-3-modal to allow multiple modals
  Modal.allowMultiple = true;

  // ModalStack data structure:
  // [{ id:'af.object.action', result: { id1: result1, id2: result2 } }]

  ModalStack = {
    _stack: ['root'],
    _context: { root: {} },
    _results: { root: {} },
    _contextForTheNext: {},
    _height() {
      debugAssert(ModalStack._stack.length >= 1);
      return ModalStack._stack.length - 1;
    },
    _dump() {
      return  'stack:' + JSON.stringify(ModalStack._stack) + '\n'
      + 'context:' + JSON.stringify(ModalStack._context) + '\n'
      + 'results:' + JSON.stringify(ModalStack._results) + '\n'
      + 'contextForTheNext:' + JSON.stringify(ModalStack._contextForTheNext) + '\n'
      + 'Sessoin:' + JSON.stringify(Session) + '\n';
    },
    active() {
      return (ModalStack._height() > 0 && _.last(ModalStack._stack));
    },
    push(dataId) { // called upon Modal.show();
      // Log.debug('Before Push', ModalStack._dump());
      ModalStack._stack.push(dataId);
      ModalStack._context[dataId] = ModalStack._contextForTheNext;
      ModalStack._contextForTheNext = {};
      _.each(ModalStack._context[dataId], (val, k) => {
        Session.set(`modalStack/${dataId}/key/${k}`, val);
      });
      ModalStack._results[dataId] = {};
      // Log.debug('After Push', ModalStack._dump());
    },
    pop(dataId) { // called upon Modal.hide();
      // Log.debug('Before Pop', ModalStack._dump());
      let topModalId = ModalStack._stack.pop();
      if (topModalId !== dataId) {  // at changing modals eg. in import, push may happen before pop
        const nextModalId = ModalStack._stack.pop();
        debugAssert((!nextModalId && !dataId) || nextModalId === dataId, 'No modal to pop on ModalStack');
        ModalStack._stack.push(topModalId);
        topModalId = nextModalId;
      }
      // clean Session
      _.each(ModalStack._context[topModalId], (val, k) => delete Session.keys[`modalStack/${topModalId}/key/${k}`]);
      _.each(ModalStack._results[topModalId], (val, k) => delete Session.keys[`modalStack/${topModalId}/result/${k}`]);
      delete ModalStack._context[topModalId];
      delete ModalStack._results[topModalId];
      // Log.debug('After Pop', ModalStack._dump());
      if (ModalStack._height() > 0) $('body').addClass('modal-open');
    },
    recordResult(afId, result) {
      if (ModalStack._height() <= 0) return; // If there is no modal, no need to pass on the result
      const lowerModalId = ModalStack._stack[ModalStack._height() - 1];
      Session.set(`modalStack/${lowerModalId}/result/${afId}`, result);
      ModalStack._results[lowerModalId][afId] = result;
    },
    readResult(ownId, afId) {
      const result = Session.get(`modalStack/${ownId}/result/${afId}`);
      return result;
    },
    setVar(key, value, keep = false) {
      // Log.debug('Before Set value', value);
      if (keep) {
        const topModalId = _.last(ModalStack._stack);
        ModalStack._context[topModalId][key] = value;
        Session.set(`modalStack/${topModalId}/key/${key}`, value);
      } else { // no keep sets it only for the next level
        ModalStack._contextForTheNext[key] = value;
      }
      // Log.debug('After Set', ModalStack._dump());
    },
    getVar(key) {
      // Log.debug('Before Get value', ModalStack._dump());
      for (let i = ModalStack._height(); i >= 0; i--) {
        const value = Session.get(`modalStack/${ModalStack._stack[i]}/key/${key}`);
        if (value !== undefined) return value;
      }
      return undefined;
    },
  };
}
