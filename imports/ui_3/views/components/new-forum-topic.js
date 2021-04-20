import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { ActionOptions } from '/imports/ui_3/views/blocks/action-buttons.js';
import { onSuccess } from '/imports/ui_3/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';

import './new-forum-topic.html';

Template.New_forum_topic.viewmodel({
  titleValue: '',
  textValue: '',
  disabled() {
    return this.textValue() === '' && 'disabled';
  },
});

Template.New_forum_topic.events({
  'click .js-attach'(event, instance) {
    const vm = instance.viewmodel;
    const doc = {
      communityId: ModalStack.getVar('communityId'),
      category: 'forum',
      title: vm.titleValue() || vm.textValue().substring(0, 25) + '...',
      text: vm.textValue(),
      status: 'opened',
    };
    const options = { entity: Topics.entities['forum'] };
    Object.setPrototypeOf(options, new ActionOptions(Topics));
    Topics.actions.create(options, doc).run(event, instance);
    vm.titleValue(''); vm.textValue('');
  },
  'click .js-send'(event, instance) {
    const vm = instance.viewmodel;
    Topics.methods.insert.call({
      communityId: ModalStack.getVar('communityId'),
      category: 'forum',
      title: vm.titleValue() || vm.textValue().substring(0, 25) + '...',
      text: vm.textValue(),
      status: 'opened',
    }, onSuccess(res => { vm.titleValue(''); vm.textValue(''); })
    );
  },
});
