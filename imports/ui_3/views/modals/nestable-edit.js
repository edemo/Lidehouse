/* global alert */
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import 'nestable';
import './nestable-edit.html';

export function serializeNestable() {
  const jq = $('#nestable');
  const json = jq.nestable('serialize');
  return json;
}

Template.Nestable_edit.onCreated(function () {
});

Template.Nestable_edit.onRendered(function () {
  const options = { maxDepth: 4 };
  if (this.data.disabled) _.extend(options, { handleClass: 'not-movable' });
  $(this.find('#nestable')).nestable(options);
});

Template.Nestable_edit.helpers({
  displaySerializedVersion() {
    const json = serializeNestable();
    return JSON.stringify(json);
  },
});

/*
Template.DD_list.helpers({
  'click js-edit'(event) {
  },
  'click js-delete'(event) {
    const li = $(event.target).closest('li');
    li.remove();
  },
});
*/
