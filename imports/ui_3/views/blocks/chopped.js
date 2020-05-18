import { Template } from 'meteor/templating';
import { sanitizeHtml } from 'meteor/djedi:sanitize-html-client';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.Chopped.viewmodel({
  showmore: false,
  chars() {
    const chars = this.templateInstance.data.chars;
    return isNaN(chars) ? CHOP_AT_CHARS : chars; // Bypassing Blaze auto last params in helper if chars is not set
  },
  choppedText() {
    const td = this.templateInstance.data;
    let text;
    if (td.text.length <= this.chars() || this.showmore()) text = td.text;
    else text = td.text.substr(0, this.chars()) + '...';
    return td.markdown ? marked.inlineLexer(sanitizeHtml(text), []) : text;
  },
  isChopped() {
    const td = this.templateInstance.data;
    return (!this.showmore() && td.text && td.text.length > this.chars());
  },
});

Template.Chopped.events({
  'click .js-showmore'(event, instance) {
    instance.viewmodel.showmore(true);
  },
});
