import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Topics } from '../topics.js';

export const Rooms = {};    // a bunch of static helpers

if (Meteor.isClient) {
  import { FlowRouter } from 'meteor/kadira:flow-router';
  import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';

  Rooms.getRoom = function getRoom(roomType, otherUserId) {
    if (!roomType || !otherUserId) return undefined;
    const userId = Meteor.userId();
    const communityId = ModalStack.getVar('communityId');
    if (roomType === 'private chat') {
      return Topics.findOne({ communityId, category: 'room', title: 'private chat', participantIds: { $size: 2, $all: [userId, otherUserId] } });
    } else if (roomType === 'tech support') {
      return Topics.findOne({ communityId, category: 'room', title: 'tech support', participantIds: { $all: [userId, otherUserId] } });
    } else {
      debugAssert(false);
      return null;
    }
  };

  Rooms.goToRoom = function goToRoom(roomType, otherUserId) {
    const room = Rooms.getRoom(roomType, otherUserId);
    if (room) {
      FlowRouter.go('Room show', { _rid: room._id });
    } else {
      Meteor.call('topics.insert', {
        communityId: ModalStack.getVar('communityId'),
        participantIds: [Meteor.userId(), otherUserId],
        category: 'room',
        title: roomType,
        text: roomType,
        status: 'opened',
      }, onSuccess((res) => {
        FlowRouter.go('Room show', { _rid: res });
      }),
      );
    }
  };
}

Factory.define('room', Topics, {
  category: 'room',
  serial: 0,
  title: 'private chat',
  text: 'private chat',
  status: 'opened',
});
