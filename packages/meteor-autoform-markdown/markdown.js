marked.setOptions({
  breaks: true
});

Template.registerHelper('renderMarkdown', function renderMarkdown(value) {
  if(value)
    return marked(value);
});

Template.afMarkdown.created = function() {
  this.markdownInput = new ReactiveVar('');
};

Template.afMarkdown.rendered = function() {
  var textArea = Template.instance().$('.markdownInput');
  Template.instance().markdownInput.set(textArea.val());
};

Template.afMarkdown.helpers({
  markdownText: function() {
    return marked(Template.instance().markdownInput.get());
  }
});

Template.afMarkdown.events({
  'keyup .markdownInput': function(evt, instance) {
    instance.markdownInput.set(evt.currentTarget.value);
  },
  'click .select': function(evt, instance) {
    evt.preventDefault();

    var markdown = evt.currentTarget.className.split(' ')[0];

    var textArea = Template.instance().$('.markdownInput');

    var selectedText = textArea.selection();

    switch (markdown) {
      case 'markdownBold':
        textArea.selection('replace', { text: '**' + selectedText + '**' });
        break;
      case 'markdownItalic':
        textArea.selection('replace', { text: '*' + selectedText + '*' });
        break;
      case 'markdownList':
        var listitems = selectedText.split('\n');
        var markdownList = "";
        listitems.forEach(function (item) {
          markdownList = markdownList + "- " + item + "\n";
        });
        textArea.selection('replace', {text: markdownList + "\n "});
        break;
      default:
        break;
    }

    instance.markdownInput.set(textArea.val());
  },
  'change .markdownHeader': function(evt, instance) {
    var header = $(evt.currentTarget).find('option:selected').val();
    var textArea = Template.instance().$('.markdownInput');

    var selectedText = textArea.selection();
    textArea.selection('replace', { text: header + selectedText });
    $(evt.currentTarget).prop('selectedIndex',0);
    instance.markdownInput.set(textArea.val());
  }
});

AutoForm.addInputType("markdown", {
  template: "afMarkdown",
});
