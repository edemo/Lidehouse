/* global AutoForm */

Template.afQuickField.helpers({
  isGroup: function afQuickFieldIsGroup() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    // Render a group of fields if we expect an Object and we don't have options
    // and we have not overridden the type
    return (c.defs.type === Object && !c.atts.options && !c.atts.type);
  },
  isFieldArray: function afQuickFieldIsFieldArray() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    // Render an array of fields if we expect an Array and we don't have options
    // and we have not overridden the type
    return (c.defs.type === Array && !c.atts.options && !c.atts.type);
  },
  groupAtts: function afQuickFieldGroupAtts() {
    // afQuickField passes `fields` and `omitFields` on to `afObjectField`
    // and `afArrayField`, but not to `afFormGroup`
    return _.omit(this, 'fields', 'omitFields');
  },
  isHiddenInput: function afQuickFieldIsHiddenInput() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    var inputType = c.atts.type;
    if (inputType) {
      var componentDef = AutoForm._inputTypeDefinitions[inputType];
      if (!componentDef) {
        throw new Error('AutoForm: No component found for rendering input with type "' + inputType + '"');
      }
      return componentDef.isHidden;
    }

    return false;
  },
  //### droka extension ###//
  isDisabled() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    return c.atts.disabled;
  },
  relation() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    return c.atts.relation;
  },
  getReactiveValue() {
    return Template.instance().reactiveValue.get();
  },
  entityObj() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    var entity = c.atts.relation;
    return { entity };
  },
  collection() {
    var c = AutoForm.Utility.getComponentContext(this, "afQuickField");
    var entity = c.atts.relation;
    var collection = Factory.get(entity).collection;
    return collection._name;
  },
});

//### droka extension ###//
Template.afQuickField.onCreated(function() {
  const instance = this;
  instance.reactiveValue = new ReactiveVar('');
});

Template.afQuickField.onRendered(function() {
  const instance = this;
  const selectElem = instance.find('select');
  if (selectElem) {
    instance.reactiveValue.set(selectElem.value);
    selectElem.addEventListener('change', function(event) { 
      instance.reactiveValue.set(event.target.value);
    }, false);
  }
});

//### droka extension ###//
Template.afQuickField.events({
  'click .js-create'(event, instance) {
    var c = AutoForm.Utility.getComponentContext(instance.data, "afQuickField");
    var entity = c.atts.relation;
    var collection = Factory.get(entity).collection;
    const options = { entity: collection.entities && collection.entities[entity], splitable() { return false; } };
//    Object.setPrototypeOf(options, new ActionOptions(collection));
    collection.actions.create(options).run(event, instance);
  },
  'click .js-view'(event, instance) {
    var c = AutoForm.Utility.getComponentContext(instance.data, "afQuickField");
    var entity = c.atts.relation;
    var collection = Factory.get(entity).collection;
//    const selectedId = $($(event.target).closest('button').nextAll('.form-group')[0]).find('select')[0].value;
    const selectedId = instance.reactiveValue.get();
    const options = {};
    const doc = collection.findOne(selectedId);
    collection.actions.view(options, doc).run(event, instance);
  },
  'click .js-edit'(event, instance) {
    var c = AutoForm.Utility.getComponentContext(instance.data, "afQuickField");
    var entity = c.atts.relation;
    var collection = Factory.get(entity).collection;
//    const selectedId = $($(event.target).closest('button').nextAll('.form-group')[0]).find('select')[0].value; 
    const selectedId = instance.reactiveValue.get();
    const options = {};
    const doc = collection.findOne(selectedId);
    collection.actions.edit(options, doc).run(event, instance);
  },
});
