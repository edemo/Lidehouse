import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

import { handleError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import './context-menu.html';

function setPosition(event) {
  const pageHeading = $('.page-heading').height();
  const navbar = $('.navbar').height();
  const top = event.pageY - pageHeading - navbar;
  const left = event.pageX - $('#fullCalendar').offset().left;
  $('.context-menu').css({ left, top });
}

function initialize() {
  const emptyContextObj = {
    topicId: '',
    template: '',
    visible: false,
  };
  Session.set('context', emptyContextObj);
}

function setMenu(template, topicId) {
  const contextObj = {
    topicId,
    template,
    visible: Session.get('context') ? Session.get('context').visible : false,
  };
  Session.set('context', contextObj);
}

function buildContext() {
  const context = Session.get('context');
  const topicId = context.topicId ? context.topicId : false;
  if (topicId) {
    const topic = Topics.findOne(topicId);
    topic.template = context.template;
    topic.visible = context.visible;
    return topic;
  }
  return context;
}

function setVisibility(directive) {
  const contextObj = Session.get('context');
  switch (directive) {
    case 'show':
      contextObj.visible = true;
      break;
    case 'hide':
      contextObj.visible = false;
      break;
    case 'toggle':
      contextObj.visible = !contextObj.visible;
      break;
    default:
      console.log('no directive');
  }
  Session.set('context', contextObj);
}

export const contextMenu = {
  setPosition,
  initialize,
  setMenu,
  buildContext,
  setVisibility,
};

Template.contextMenu.viewmodel({
  dataVisible() {
    const visible = Session.get('context').visible;
    if (visible) return true;
    return false;
  },
});

Template.contextMenu.events({
  'click .context-menu'() {
    setVisibility('hide');
  },
});
