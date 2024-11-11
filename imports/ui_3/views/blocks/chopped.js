import { Template } from 'meteor/templating';
import { sanitizeHtml } from 'meteor/djedi:sanitize-html-client';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.ChoppedChars.viewmodel({
  showmore: false,
  chars() {
    const chars = this.templateInstance.data.chars;
    return isNaN(chars) ? CHOP_AT_CHARS : chars; // Bypassing Blaze auto last params in helper if chars is not set
  },
  choppedText() {
    const td = this.templateInstance.data;
    if (!td.text) return;
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

Template.ChoppedChars.events({
  'click .js-showmore'(event, instance) {
    instance.viewmodel.showmore(true);
  },
});

//-------------------------------------------------------------------------

const CHOP_AT_HEIGHT = 400;

Template.ChoppedHeight.viewmodel({
  showmore: undefined,
  cssHeight: undefined,
  onRendered() {
    this.showmore(false);
  },
  autorun() {
    if (this.showmore() === false) {
      const block = this.templateInstance.find('div');
      if (block.clientHeight > this.maxHeight()) {
        const maxHeight = this.maxHeight();
        this.cssHeight(maxHeight);
      }
    } else this.cssHeight(undefined);
  },
  cssStyle() {
    return ({
      style: this.cssHeight() && `{ max-height: ${this.cssHeight()}px; overflow: hidden; position: relative }`,
    });
  },
  maxHeight() {
    const height = this.templateInstance.data.height;
    if (!height || Number.isNaN(height)) return CHOP_AT_HEIGHT; // Bypassing Blaze auto last params in helper if chars is not set
    else return height;
  },
//  currentHeight() {
//    if (!this.showmore()) return this.maxHeight();
//    else return undefined;
//  },
  isChopped() {
    if (this.showmore() === undefined) return false;
    const block = this.templateInstance.find('div');
    const cssHeight = this.cssHeight();
    const isChopped = !this.showmore() && cssHeight && block.scrollHeight > cssHeight;
    return isChopped;
  },
  sanitizedText() {
    const td = this.templateInstance.data;
    if (!td.text) return;
    return marked.inlineLexer(sanitizeHtml(td.text), []);
  },
});

Template.ChoppedHeight.events({
  'click .js-showmore'(event, instance) {
    instance.viewmodel.showmore(true);
  },
});
