import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import './context-menu.html';

function setPosition(event, element) {
  event.preventDefault();
  const offset = $(element).offset();
  const top = event.pageY - offset.top - 5;
  const left = event.pageX - offset.left - 5;
  $('#context-menu').css({ left, top });
}

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

function setVisibility(directive) {
  const contextObj = Session.get('context');
  const visible = contextObj.visible ? 'none' : 'block';
  switch (directive) {
    case 'show':
      $('#context-menu').css('display', 'block');
      contextObj.visible = true;
      break;
    case 'hide':
      $('#context-menu').css('display', 'none');
      contextObj.visible = false;
      break;
    case 'toggle':
      $('#context-menu').css('display', visible);
      contextObj.visible = !contextObj.visible;
      break;
    default:
      console.log('no directive');
  }
  Session.set('context', contextObj);
}

function show(event, template, element, id) {
  setMenu(template, id);
  setPosition(event, element);
  setVisibility('show');
}

function hide() {
  setVisibility('hide');
}

export const contextMenu = {
  setPosition,
  initialize,
  setMenu,
  setVisibility,
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
