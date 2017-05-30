import './board.html';

Template.Board.onRendered(function boardOnRendered() {
  this.autorun(() => {
    //accordion click event adder,  open onload
    var acc = document.getElementsByClassName("accordion");
    var acc2 = document.getElementsByClassName("accordion-comment");
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
      acc2[i].onclick = function() {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        var parent_acc = this.closest('.accordion-content');
        if (panel.style.maxHeight){
          panel.style.maxHeight = null;
          fullheight = fullheight - panel.scrollHeight;
        } else {
          fullheight = fullheight + panel.scrollHeight;
          panel.style.maxHeight = panel.scrollHeight + "px";
          parent_acc.style.maxHeight = parent_acc.scrollHeight + fullheight + "px";
        }
      }
    }
  });
});
