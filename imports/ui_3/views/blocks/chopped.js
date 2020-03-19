import { Template } from 'meteor/templating';
import { sanitizeHtml } from 'meteor/djedi:sanitize-html-client';
import { $ } from 'meteor/jquery';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.Chopped.viewmodel({
  showmore: false,
  choppedText(ctx) {
    let text;
    const chars = isNaN(ctx.chars) ? CHOP_AT_CHARS : ctx.chars; // Bypassing Blaze auto last params in helper if chars is not set
    if (ctx.text.length <= chars || this.showmore()) text = ctx.text;
    else text = ctx.text.substr(0, chars) + '... ';
    return ctx.markdown ? sanitizeHtml(marked(text)) : text;
  },
  isChopped(ctx) {
    const chars = isNaN(ctx.chars) ? CHOP_AT_CHARS : ctx.chars; // Bypassing Blaze auto last params in helper if chars is not set
    return (ctx.text && ctx.text.length > chars);
  },
});

Template.Chopped.events({
  'click .js-showmore'(event, instance) {
    instance.viewmodel.showmore(true);
  },
});
