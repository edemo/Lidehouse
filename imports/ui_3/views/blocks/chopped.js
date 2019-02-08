import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import './chopped.html';

const CHOP_AT_CHARS = 600;

Template.Chopped.helpers({
  choppedText() {
    const chars = isNaN(this.chars) ? CHOP_AT_CHARS : this.chars; // Bypassing Blaze auto last params in helper if chars is not set
    if (this.text.length <= chars) return this.text;
    const textPart = this.text.substr(0, chars);
    return textPart + '... ';
  },
  isChopped() {
    const chars = isNaN(this.chars) ? CHOP_AT_CHARS : this.chars; // Bypassing Blaze auto last params in helper if chars is not set
    return (this.text && this.text.length > chars);
  },
});

Template.Chopped.events({
  'click .js-showmore'(event, instance) {
    event.preventDefault();
    const textHolder = $(event.target).parent();
    textHolder.text(this.text);
  },
});
