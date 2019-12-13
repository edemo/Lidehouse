import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { $ } from 'meteor/jquery';

import './context-menu.html';

function initialize(template, collection, instance) {
  instance.context = new ReactiveVar({});
  Template[template].helpers({
    contextMenu_ctx() {
      const context = instance.context.get();
      if (context.id) context.doc = collection.findOne(context.id);
      return context;
    },
  });
}

function show(event, contextObj, instance) {
  instance.context.set(contextObj);
  // We used meteor variable to display, but the hiding is flickering
  $('#context-menu').css('display', 'block');
  if (event.screenX > window.innerWidth/2) {
    $('#context-menu').offset({ left: event.pageX + 10, top: event.pageY - 10 });
    Meteor.defer(function () { $('#context-menu').children(':first').removeClass('pull-left'); });
    Meteor.defer(function () { $('#context-menu').children(':first').addClass('pull-right'); });
  } else {
    $('#context-menu').offset({ left: event.pageX - 10, top: event.pageY - 10 });
    Meteor.defer(function () { $('#context-menu').children(':first').removeClass('pull-right'); });
    Meteor.defer(function () { $('#context-menu').children(':first').addClass('pull-left'); });
  }
}

function hide() {
  $('#context-menu').css('display', 'none');
}

export const ContextMenu = {
  initialize,
  show,
  hide,
};

Template.ContextMenu.events({
  'click #context-menu'() {
    hide();
  },
  'mouseleave #context-menu'() {
    hide();
  },
});

