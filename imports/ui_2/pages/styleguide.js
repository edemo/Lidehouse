import './styleguide.html';

Template.Styleguide.onRendered(function styleguideOnRendered() {
  this.autorun(() => {
    //prettify code render
    //<![CDATA[
      (function () {
        function htmlEscape(s) {
          return s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        }

        // this page's own source code
        var quineHtml = htmlEscape(document.getElementById("btns-group").innerHTML);
        var accordionHtml = htmlEscape(document.getElementById("accordion-sample").innerHTML);
        var progressbarHtml = htmlEscape(document.getElementById("progressbar-sample").innerHTML);
        var voteboxHtml = htmlEscape(document.getElementById("votebox-sample").innerHTML);
        var prefvoteHtml = htmlEscape(document.getElementById("sorting-vote-sample").innerHTML);
        var statusHtml = htmlEscape(document.getElementById("status-sample").innerHTML);

        // Highlight the operative parts:
        quineHtml = quineHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
        accordionHtml = accordionHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
        progressbarHtml = progressbarHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
        voteboxHtml = voteboxHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
        prefvoteHtml = prefvoteHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
        statusHtml = statusHtml.replace(
          /&lt;script src[\s\S]*?&gt;&lt;\/script&gt;|&lt;!--\?[\s\S]*?--&gt;|&lt;pre\b[\s\S]*?&lt;\/pre&gt;/g,
          '<span class="operative">$&<\/span>');
          // insert into PRE
        document.getElementById("quine").innerHTML = quineHtml;
        document.getElementById("accordion_code").innerHTML = accordionHtml;
        document.getElementById("progressbar_code").innerHTML = progressbarHtml;
        document.getElementById("votebox_code").innerHTML = voteboxHtml;
        document.getElementById("sorting-vote-code").innerHTML = prefvoteHtml;
        document.getElementById("status-code").innerHTML = statusHtml;
      })();
      //]]>

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

    // pref vote data  gather
    // TODO
  });
});
