import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import './messenger.html';


Template.Messenger.onCreated(function onCreated() {
  this.state = new ReactiveDict();
  this.state.set('peopleOpen', false);
});

Template.Messenger.helpers({
  peopleOpen() {
    const instance = Template.instance();
    return instance.state.get('peopleOpen') && 'people-open';
  },
  templateGestures: {
    'swiperight .cordova'(event, instance) {
      $('#people')[0].classList.remove('people-open');
    },
    'swipeleft .cordova'(event, instance) {
      $('#people')[0].classList.add('people-open');
    },
  },
});

Template.Messenger.events({
  'click .js-people'(event) {
    console.log("clicked", $('#people'));
    $('#people')[0].classList.toggle('people-open');
  },
  'click .content-overlay'(event, instance) {
    instance.state.set('peopleOpen', false);
    event.preventDefault();
  },

  'click #people .person'(event, instance) {
    $('#people')[0].classList.remove('people-open');
  },
});
