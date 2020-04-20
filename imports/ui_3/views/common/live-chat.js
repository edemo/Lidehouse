import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Session } from 'meteor/session';
import { getActiveCommunity, getActiveCommunityId } from '/imports/ui_3/lib/active-community';

import './live-chat.html';

Template.Live_Chat.helpers({
  liveAgenda() {
    const communityId = getActiveCommunityId();
    return Agendas.findOne({ communityId, live: true });
  },
  notJoined() {
    return !Session.get('joinedVideo');
  },
  joined() {
    return Session.get('joinedVideo');
  },
});

export function joinLiveChat(user, doc) {
  const community = getActiveCommunity();
  const houseName = community.name;
  const houseGUID = community._id;
  const agendaName = doc.title;
  const userName = user.displayOfficialName();
  const userAvatar = user.avatar;

  let roomName = houseGUID + houseName;
  roomName = roomName.replace(/[_\W]+/g,'');

  const domain = 'meet.jit.si';
  const jitsiOptions = {
    roomName,
    parentNode: $('#live-chat')[0],
    configOverwrite: {},
    onload() {
      api.executeCommand('subject', houseName + ' - ' + agendaName);
      api.executeCommand('displayName', userName);
      api.executeCommand('avatarUrl', userAvatar);
    },
  };
  Session.set('joinedVideo', true);
  const api = new JitsiMeetExternalAPI(domain, jitsiOptions);
  return api;
}

Template.Live_Chat.events({
  'click .spin-icon'() {
    $('.live-chat-config-box').toggleClass('show');
  },
  'click .join-video'() {
    const communityId = getActiveCommunityId();
    joinLiveChat(Meteor.user(), Agendas.findOne({ communityId, live: true }));
  },
});
