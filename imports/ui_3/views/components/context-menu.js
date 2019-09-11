import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { debugAssert } from '/imports/utils/assert.js';

import './context-menu.html';

function initialize(template, collection) {
  const emptyContextObj = {
    id: '',
    template: '',
    visible: false,
  };
  Session.set('context', emptyContextObj);
  Template[template].helpers({
    contextMenu_ctx() {
      const context = Session.get('context');
      if (context.id) context.doc = collection.findOne(context.id);
      return context;
    },
  });
}

function setMenu(template, id) {
  const contextObj = {
    id,
    template,
    visible: Session.get('context') ? Session.get('context').visible : false,
  };
  Session.set('context', contextObj);
}

function setVisibility(directive, event) {
  const contextObj = Session.get('context');
  switch (directive) {
    case 'show':
      $('#context-menu').css('display', 'block');
      $('#context-menu').offset({ left: event.pageX - 5, top: event.pageY - 5 });
      contextObj.visible = true;
      break;
    case 'hide':
      $('#context-menu').css('display', 'none');
      contextObj.visible = false;
      break;
    default:
      debugAssert(false, 'no such directive');
  }
  Session.set('context', contextObj);
}

function show(event, template, id) {
  setMenu(template, id);
  setVisibility('show', event);
}

function hide() {
  setVisibility('hide');
}

export const contextMenu = {
  initialize,
  show,
  hide,
};

Template.contextMenu.events({
  'click #context-menu'() {
    setVisibility('hide');
  },
  'mouseleave #context-menu'() {
    setVisibility('hide');
  },
});
