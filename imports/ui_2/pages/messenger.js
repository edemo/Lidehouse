import './messenger.html';

Template.Messenger.helpers({
  menuOpen() {
    const instance = Template.instance();
    return instance.state.get('peopleOpen') && 'people-open';
  },
  templateGestures: {
    'swiperight .cordova'(event, instance) {
      $('#people')[0].classList.remove('peopleOpen');
    },
    'swipeleft .cordova'(event, instance) {
      $('#people')[0].classList.add('peopleOpen');
    },
  },
});

Template.Custom_body.events({
  'click .js-people'(event) {
    console.log("clicked", $('#people'));
    $('#people')[0].classList.toggle('peopleOpen');
  },
  'click .content-overlay'(event, instance) {
    instance.state.set('peopleOpen', false);
    event.preventDefault();
  },

  'click #people .person'(event, instance) {
    $('#people')[0].classList.remove('peopleOpen');
  },
});
