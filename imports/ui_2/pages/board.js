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
    var fullheight = 0;

    for (i = 0; i < acc.length; i++) {
      acc[i].onclick = function() {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        var child_panels = $(panel).find('.accordion-content');
        // console.log(child_panels[0].scrollHeight);
        if (panel.style.maxHeight){
          panel.style.maxHeight = null;
        } else {
          console.log(fullheight);
          panel.style.maxHeight = panel.scrollHeight + fullheight + "px";
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
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category, closed: false });
  },
  displayTime() {
    return moment(this.createdAt).format('YYYY MMM Do');
  },
});
