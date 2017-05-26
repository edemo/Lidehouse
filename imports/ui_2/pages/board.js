/* globals document */

import { Template } from 'meteor/templating';

import '../components/comments-section.html';
import './board.html';

Template.Board.onRendered(function boardOnRendered() {
  this.autorun(() => {
    //accordion click event adder,  open onload
    var acc = document.getElementsByClassName("accordion");
    var acc2 = document.getElementsByClassName("accordion-comment");
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

    for (i = 0; i < acc2.length; i++) {
      acc2[i].onclick = function() {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight){
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      }
    }
  });
});
