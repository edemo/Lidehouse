import { Template } from 'meteor/templating';
import { sanitizeHtml } from 'meteor/djedi:sanitize-html-client';
import { $ } from 'meteor/jquery';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.Chopped.viewmodel({
  showmore: false,
  choppedText() {
    const td = this.templateInstance.data;
    let text;
    const chars = isNaN(td.chars) ? CHOP_AT_CHARS : td.chars; // Bypassing Blaze auto last params in helper if chars is not set
    if (td.text.length <= chars || this.showmore()) text = td.text;
    else text = td.text.substr(0, chars) + '... ';
    return td.markdown ? marked(sanitizeHtml(text)) : text;
  },
  isChopped() {
    const td = this.templateInstance.data;
    const chars = isNaN(td.chars) ? CHOP_AT_CHARS : td.chars; // Bypassing Blaze auto last params in helper if chars is not set
    return (!this.showmore() && td.text && td.text.length > chars);
  },
});

Template.Chopped.events({
  'click .js-showmore'(event, instance) {
    instance.viewmodel.showmore(true);
  },
});
