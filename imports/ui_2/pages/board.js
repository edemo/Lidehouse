/* globals document */

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Topics } from '/imports/api/topics/topics.js';

import '../components/comments-section.js';
import '../components/votebox.js';
import '../components/chatbox.js';
import './board.html';


Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Board.onRendered(function boardOnRendered() {
  this.autorun(() => {
    //accordion click event adder,  open onload
    var acc = document.getElementsByClassName("accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
      acc[i].onclick = function() {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight){
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      }
      acc[i].classList.toggle("active");
      var panel = acc[i].nextElementSibling;
      panel.style.maxHeight = "none";
    }
  });
});

Template.Board.helpers({
  topics(category) {
    return Topics.find({ category, closed: false });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});
