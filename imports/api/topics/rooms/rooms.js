import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '../topics.js';

export const Rooms = {};    // a bunch of static helpers

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { FlowRouter } from 'meteor/kadira:flow-router';
  import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';

  Rooms.privateChatRoom = function privateChatRoom(userId, otherUserId) {
    debugAssert(userId && otherUserId);
    const communityId = Session.get('activeCommunityId');
    return Topics.findOne({ communityId, category: 'room', title: 'private chat', participantIds: { $size: 2, $all: [userId, otherUserId] } });
  };

  Rooms.techSupportRoom = function techSupportRoom(userId) {
    const communityId = Session.get('activeCommunityId');
    return Topics.findOne({ communityId, category: 'room', title: 'tech support', participantIds: userId });
  };

  Rooms.goToPrivateRoomWith = function goToPrivateRoomWith(otherUserId) {
    const room = Rooms.privateChatRoom(Meteor.userId(), otherUserId);
    if (room) {
      FlowRouter.go('Room.show', { _rid: room._id });
    } else {
      Meteor.call('topics.insert', {
        communityId: Session.get('activeCommunityId'),
        userId: Meteor.userId(),
        participantIds: [Meteor.userId(), otherUserId],
        category: 'room',
        title: 'private chat',
      }, onSuccess((res) => {
        FlowRouter.go('Room.show', { _rid: res });
      }),
      );
    }
  };
}
