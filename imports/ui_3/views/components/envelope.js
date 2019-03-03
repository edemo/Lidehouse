
import { $ } from 'meteor/jquery';

export function createEnvelope(element) {
  element.wrap($('<div>', { class: 'envelope-letter' }));
  const envelopeLetter = element.parent();
  envelopeLetter.wrap($('<div>', { class: 'envelope' }));
  const envelope = envelopeLetter.parent();
  envelope.prepend($('<div>', { class: 'envelope-flap' }));
  const envelopeFlap = envelope.find('.envelope-flap');
  envelope.append($('<div>', { class: 'envelope-back' }));
//  const animationDuration = 1000;

  return {
    open() {
      envelopeLetter.removeClass('letter-animation-end');
      envelopeFlap.removeClass('flap-animation-end');
      envelopeLetter.removeClass('letter-animation');
      envelopeFlap.removeClass('flap-animation');
      envelopeLetter.addClass('letter-animation-reverse');
//      envelopeLetter.addClass('letter-border');
      envelopeFlap.addClass('flap-animation-reverse');
    },
    opened() {
      envelopeLetter.removeClass('letter-animation-end');
      envelopeFlap.removeClass('flap-animation-end');
      envelopeLetter.addClass('letter-animation-reverse-end');
      envelopeFlap.addClass('flap-animation-reverse-end');
//      envelopeLetter.addClass('letter-border');
    },
    close() {
      envelopeLetter.removeClass('letter-animation-reverse-end');
      envelopeFlap.removeClass('flap-animation-reverse-end');
      envelopeLetter.removeClass('letter-animation-reverse');
      envelopeFlap.removeClass('flap-animation-reverse');
//      Meteor.setTimeout(function removeBorder() { envelopeLetter.removeClass('letter-border'); }, animationDuration);
      envelopeLetter.addClass('letter-animation');
      envelopeFlap.addClass('flap-animation');
    },
    closed() {
      envelopeLetter.removeClass('letter-animation-reverse-end');
      envelopeFlap.removeClass('flap-animation-reverse-end');
//      envelopeLetter.removeClass('letter-border');
      envelopeLetter.addClass('letter-animation-end');
      envelopeFlap.addClass('flap-animation-end');
    },
  };
}
