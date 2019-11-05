import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import './simple-reactive-datatable.html';

Template.SimpleReactiveDatatable.viewmodel({
  tableDataFn() {
    const selector = this.templateInstance.data.selector;
    const collection = Mongo.Collection.get(this.templateInstance.data.collection);
    return () => collection.find(selector).fetch();
  },
});
