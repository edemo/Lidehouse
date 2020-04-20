Schemas = {};

Quests = new Mongo.Collection("quests");

Schemas.Quest = new SimpleSchema({
  title: {
    type: String
  },
  text: {
    type: String,
    autoform: {
      type: 'markdown'
    }
  }
});

Quests.attachSchema(Schemas.Quest);

if(Meteor.isClient) {
  var quest = new ReactiveVar(false);
  Template.newquest.helpers({
    quest: function() {
        Meteor.subscribe("quests", function() {
          quest.set(Quests.findOne());
        });
      return quest.get();
    }
  });
}

if(Meteor.isServer) {
  Meteor.publish("quests", function () {
    return Quests.find();
  });
}
