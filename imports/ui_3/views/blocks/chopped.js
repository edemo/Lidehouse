import { Template } from 'meteor/templating';
import { sanitizeHtml } from 'meteor/djedi:sanitize-html-client';
import { $ } from 'meteor/jquery';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.Chopped.viewmodel({
  showmore: false,
  onRendered() {
    const t = this.templateInstance;
    t.$('.js-showmore').appendTo(t.$('.showmore'));
  },
  choppedText() {
    const td = this.templateInstance.data;
    let text;
    const dots = td.markdown ? '...<span class="showmore"></span>' : '...';
    const chars = isNaN(td.chars) ? CHOP_AT_CHARS : td.chars; // Bypassing Blaze auto last params in helper if chars is not set
    if (td.text.length <= chars || this.showmore()) text = td.text;
    else text = td.text.substr(0, chars) + dots;
    const sanitizedText = sanitizeHtml(text, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['span']),
      allowedClasses: {
        'span': ['showmore'],
      },
    });
    return td.markdown ? marked(sanitizedText) : text;
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
