import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Session } from 'meteor/session';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community';

import './video.html';

Template.Video.helpers({
  liveAgenda() {
    return Agendas.findOne({ live: true });
  },
  notJoined() {
    return !Session.get('joinedVideo');
  },
});

export function joinVideo(user, doc) {
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
    parentNode: document.querySelector('#video'), // can't use jquery here
    configOverwrite: {},
    interfaceConfigOverwrite: {
      filmStripOnly: true,
    },
    onload() {
      api.executeCommand('subject', houseName + ' - ' + agendaName);
      api.executeCommand('displayName', userName);
      api.executeCommand('avatarURL', userAvatar);
    },
  };
  Session.set('joinedVideo', true);
  const api = new JitsiMeetExternalAPI(domain, jitsiOptions);
  return api;
}

Template.Video.events({
  'click .spin-icon'() {
      $('.video-config-box').toggleClass('show');
  },
  'click .join-video'() {
    joinVideo(Meteor.user(), Agendas.findOne({ live: true }));
  },
});
