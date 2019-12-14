import { Template } from 'meteor/templating';
import { Mongo } from 'meteor/mongo';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import './menu-overflow-guard.js';
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
      const options = {
        entity: entity && collection.entities[entity],
        status: doc && status && doc.statusObject(status),
      };
      action.run(options, doc, event, instance);
    };
  });
  return eventHandlers;
}

function buttonData2HtmlObj(instanceData) {
  const obj = {};
  obj['data-id'] = (typeof instanceData.doc === 'object') ? instanceData.doc._id : instanceData.doc;
  obj['data-status'] = instanceData.options && instanceData.options.status && instanceData.options.status.name;
  obj['data-entity'] = instanceData.options && instanceData.options.entity && instanceData.options.entity.name;
  // TODO should copy all data-* atts over in one generic call
  //  _.forEach(instanceData.options, (value, key) => {
  //    obj[`data-${key}`] = value;
  //  });
  return obj;
}

function fetchDoc(instanceData) {
  if (typeof instanceData.doc === 'string') {
    const collection = Mongo.Collection.get(instanceData.collection);
    instanceData.doc = collection.findOne(instanceData.doc);
  }
  return instanceData.doc;
}

function fetchOptions(instanceData) {
  if (!instanceData.options) return {};
  if (typeof instanceData.options.status === 'string') {
    const collection = Mongo.Collection.get(instanceData.collection);
    instanceData.options.status = collection.statuses[instanceData.options.status];
  }
  if (typeof instanceData.options.entity === 'string') {
    const collection = Mongo.Collection.get(instanceData.collection);
    instanceData.options.entity = collection.entities[instanceData.options.entity];
  }
  return instanceData.options;
}

//---------------------------------------------------------------------------

Template.Action_button.viewmodel({
  title() {
    const action = this.templateInstance.data.action;
    if (action.label) return action.label(this.templateInstance.data.options, this.getDoc());
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
  getOptions() {
    return fetchOptions(this.templateInstance.data);
  },
  getDoc() {
    return fetchDoc(this.templateInstance.data);
  },
  dataObject() {
    return buttonData2HtmlObj(this.templateInstance.data);
  },
});

Template.Action_button_status_change.viewmodel({
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  optionsWithNewStatus(status) {
    return _.extend({}, this.templateInstance.data.options, { status });
  },
  getDoc() {
    return fetchDoc(this.templateInstance.data);
  },
});

Template.Action_button.events({
  // This can be used most of the time to handle the click event - except when we are unable to render a proper template (like into a jquery cell).
  'click .btn'(event, instance) {
    instance.data.action.run(instance.viewmodel.getOptions(), instance.viewmodel.getDoc(), event, instance);
  },
});

Template.Action_buttons_group.viewmodel({
  _actions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actions = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import', 'like', 'mute', 'block'));
    return actions;
  },
});

//-------------------------------------------------------------

Template.Action_listitem.viewmodel({
  title() {
    const action = this.templateInstance.data.action;
    if (action.label) return action.label(this.templateInstance.data.options, this.getDoc());
    return action.name;
  },
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  getOptions() {
    return fetchOptions(this.templateInstance.data);
  },
  getDoc() {
    return fetchDoc(this.templateInstance.data);
  },
  dataObject() {
    return buttonData2HtmlObj(this.templateInstance.data);
  },
});

Template.Action_listitem.events({
  'click li.enabled'(event, instance) {
    instance.data.action.run(instance.viewmodel.getOptions(), instance.viewmodel.getDoc(), event, instance);
  },
  'click li:not(.enabled)'(event, instance) {
    event.stopPropagation();
  },
});

Template.Action_listitems_status_change.viewmodel({
  optionsWithNewStatus(status) {
    return _.extend({}, this.templateInstance.data.options, { status });
  },
});

Template.Action_buttons_dropdown_list.viewmodel({
  _actions() {
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    const actions = this.templateInstance.data.actions
      ? this.templateInstance.data.actions.split(',').map(a => collection.actions[a])
//      : _.map(collection.actions, (action, name) => action);
      : _.values(_.omit(collection.actions, 'new', 'import', 'view', 'like'));
    return actions;
  },
  needsDividerAfter(action) {
    switch (action.name) {
      case 'statusChange': return true;
      default: return false;
    }
  },
});

Template.Action_buttons_dropdown.viewmodel({
  long() {
    return this.templateInstance.data.size === 'lg' || this.templateInstance.data.size === 'xl';
  },
  getDoc() {
    return fetchDoc(this.templateInstance.data);
  },
});
