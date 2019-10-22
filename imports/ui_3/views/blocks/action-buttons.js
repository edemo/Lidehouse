import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import './action-buttons.html';

export function actionHandlers(actions) {
  const eventHandlers = {};
  _.each(actions, (action, name) => {
    eventHandlers[`click .${actions.collection._name} .js-${name}`] = function (event, instance) {
      const id = $(event.target).closest('[data-id]').data('id');
      action.run(id, event, instance);
    };
  });
  return eventHandlers;
}

Template.Action_button_small.helpers({
  visible() {
    return this.action.visible(this._id);
  },
});

/*
Template.Action_buttons_group_small.onCreated(function () {
  const actions = this.data.actions;
  actions.forEach(function (action) {
    Template.Action_buttons_group_small.events({
      [`click .js-${action.name}`](event, instance) {
        const id = $(event.target).closest('[data-id]').data('id');
        actions[action.name].run(id);
      },
    });
  });
});
*/
