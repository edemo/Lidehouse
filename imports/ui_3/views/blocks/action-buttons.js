import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import './action-buttons.html';

// Apply these event handlers to your template, if the buttons are not created as Action_button templates,
// hence they don't have their event handlers yet
// (like buttons in datatables, where the buttons are not templates, just simple html)
export function actionHandlers(collection) {
  const collectionName = collection._name;
  const eventHandlers = {};
  _.each(collection.actions, (action, actionName) => {
    eventHandlers[`click .js-${actionName}.${collectionName},.${collectionName} .js-${actionName}`] = function (event, instance) {
      // TODO should copy all data-* atts over in one generic call
      const id = $(event.target).closest('[data-id]').data('id');
      const doc = id ? collection.findOne(id) : undefined;
      const entity = $(event.target).closest('[data-entity]').data('entity');
      const status = $(event.target).closest('[data-status]').data('status');
      const options = { id, entity, status };
      action.run(options, doc, event, instance);
    };
  });
  return eventHandlers;
}

Template.Action_button.viewmodel({
  title() {
    const action = this.templateInstance.data.action;
    if (action.label) return action.label(this.templateInstance.data.options);
    return action.name;
  },
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  btnSize() {
    switch (this.templateInstance.data.size) {
      case 'xl': return 'md';
      default: return 'xs';
    }
  },
  document() {
    const instanceData = this.templateInstance.data;
    if (typeof instanceData.doc === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.doc = collection.findOne(instanceData.doc);
    }
    return instanceData.doc;
  },
  dataObject() {
    const obj = {};
    _.forEach(this.templateInstance.data.options, (value, key) => {
      obj[`data-${key}`] = value;
    });
    const instanceData = this.templateInstance.data;
    obj['data-id'] = (typeof instanceData.doc === 'object') ? instanceData.doc._id : instanceData.doc;
    console.log("???", obj);
    return obj;
  },
});

Template.Action_button_status_change.viewmodel({
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  optionsWithNewStatus(status) {
    return _.extend({}, this.templateInstance.data.options, { newStatus: status });
  },
  document() {
    const instanceData = this.templateInstance.data;
    if (typeof instanceData.doc === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.doc = collection.findOne(instanceData.doc);
    }
    return instanceData.doc;
  },
});

Template.Action_button.events({
  // This cannot be used, because Blaze.toHTML does not add the event handlers, only Blaze.render would do that
  // but Blaze.render needs the parent node, and we dont have that, so we are unable to render a template into a jquery cell.
  'click .btn'(event, instance) {
    instance.data.action.run(instance.data.options, instance.viewmodel.doc(), event, instance);
  },
});

Template.Action_buttons_group.viewmodel({
  _actions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actions = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import'));
    return actions;
  },
});

//-------------------------------------------------------------

Template.Action_listitem.viewmodel({
  title() {
    const action = this.templateInstance.data.action;
    if (action.label) return action.label(this.templateInstance.data.options);
    return action.name;
  },
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  document() {
    const instanceData = this.templateInstance.data;
    if (typeof instanceData.doc === 'string') {
      const collection = Mongo.Collection.get(instanceData.collection);
      instanceData.doc = collection.findOne(instanceData.doc);
    }
    return instanceData.doc;
  },
  dataObject() {
    const obj = {};
    _.forEach(this.templateInstance.data.options, (value, key) => {
      obj[`data-${key}`] = value;
    });
    const instanceData = this.templateInstance.data;
    obj['data-id'] = (typeof instanceData.doc === 'object') ? instanceData.doc._id : instanceData.doc;
    console.log("!!!", obj);
    return obj;
  },
});

Template.Action_listitem.events({
  'click li'(event, instance) {
    instance.data.action.run(instance.data.options, instance.viewmodel.doc(), event, instance);
  },
});

Template.Action_listitems_status_change.viewmodel({
  optionsWithNewStatus(status) {
    return _.extend({}, this.templateInstance.data.options, { newStatus: status });
  },
});

Template.Action_buttons_dropdown.viewmodel({
  _actions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actions = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import', 'view', 'like'));
    return actions;
  },
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  needsDividerAfter(action) {
    switch (action.name) {
      case 'statusChange': return true;
      default: return false;
    }
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
