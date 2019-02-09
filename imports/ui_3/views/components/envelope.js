import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

export function createEnvelope(element) {
  element.wrap($('<div>', { class: 'envelope-letter' }));
  const envelopeLetter = element.parent();
  envelopeLetter.wrap($('<div>', { class: 'envelope' }));
  const envelope = envelopeLetter.parent();
  envelope.prepend($('<div>', { class: 'envelope-flap' }));
  const envelopeFlap = envelope.find('.envelope-flap');
  envelope.append($('<div>', { class: 'envelope-back' }));

  return {
    open() {
      envelopeLetter.addClass('voted-letter');
      envelopeLetter.removeClass('letter-animation');
      envelopeFlap.removeClass('flap-animation');
      envelopeLetter.addClass('letter-animation-reverse');
      envelopeFlap.addClass('flap-animation-reverse');
    },
    close() {
      envelopeLetter.removeClass('voted-letter');
      envelopeLetter.removeClass('letter-animation-reverse');
      envelopeFlap.removeClass('flap-animation-reverse');
      envelopeLetter.addClass('letter-animation');
      envelopeFlap.addClass('flap-animation');
    },
  };
}
