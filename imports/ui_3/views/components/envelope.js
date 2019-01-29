import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

export function envelope(templateName, ReactiveDictName, ReactiveDictData) {

  Template[templateName].onRendered(function () {
    this.$('.letter-content').wrap($('<div>', { class: 'envelope-letter' }));
    this.$('.envelope-letter').wrap($('<div>', { class: 'envelope' }));
    this.$('.envelope').prepend($('<div>', { class: 'envelope-flap' }));
    this.$('.envelope').append($('<div>', { class: 'envelope-back' }));

    this.autorun(() => {
      const value = Template.instance()[ReactiveDictName].get(ReactiveDictData);
      if (value) {
        this.$('.envelope-letter').removeClass('voted-letter');
        this.$('.envelope-letter').removeClass('letter-animation-reverse');
        this.$('.envelope-flap').removeClass('flap-animation-reverse');
        this.$('.envelope-letter').addClass('letter-animation');
        this.$('.envelope-flap').addClass('flap-animation');
      } else {
        this.$('.envelope-letter').addClass('voted-letter');
        this.$('.envelope-letter').removeClass('letter-animation');
        this.$('.envelope-flap').removeClass('flap-animation');
        this.$('.envelope-letter').addClass('letter-animation-reverse');
        this.$('.envelope-flap').addClass('flap-animation-reverse');
      }
    });
  });
}
