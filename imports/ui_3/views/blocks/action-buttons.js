import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import './action-buttons.html';

export function actionHandlers(collection) {
  const eventHandlers = {};
  _.each(collection.actions, (action, name) => {
    eventHandlers[`click .${collection._name} .js-${name}`] = function (event, instance) {
      const id = $(event.target).closest('[data-id]').data('id');
      action.run(id, event, instance);
    };
  });
  return eventHandlers;
}

Template.Action_button.events({
  'click .btn'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    this.action.run(id, event, instance);
  },
});

Template.Action_button.helpers({
  visible() {
    return this.action.visible(this._id);
  },
  large() {
    return this.size === 'lg';
  },
});

Template.Action_buttons_group.helpers({
  _actions() {
    const collection = Mongo.Collection.get(this.collection);
    const actions = this.actions
      ? this.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new'));
    return actions;
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
