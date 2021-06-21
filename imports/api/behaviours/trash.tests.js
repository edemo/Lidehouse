/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { freshFixture } from '/imports/api/test-utils.js';
import { Clock } from '/imports/utils/clock';
import { Trash, emptyOldTrash, TRASH_KEEP_DAYS } from './trash.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

if (Meteor.isServer) {

  describe('Trash', function () {
    this.timeout(15000);
    let Fixture;
    let communityId;
    let membershipId;
    let parcelId;
    let userId;
    let supplierId;
    let topicId;

    before(function () {
      Fixture = freshFixture();
      communityId = Fixture.demoCommunityId;
      membershipId = Memberships.findOne()._id;
      parcelId = Fixture.dummyParcels[2];
      userId = Fixture.dummyUsers[2];
      supplierId = Fixture.supplier;
      topicId = Topics.findOne({ communityId, category: 'forum' })._id;
    });

    it('moves deleted document from timestamped collection to trash', function (done) {
      const membership = Memberships.findOne(membershipId);
      chai.assert.isDefined(membership);
      Memberships.remove(membershipId);
      chai.assert.isUndefined(Memberships.findOne(membershipId));
      const removedMembership = Trash.findOne({ id: membership._id });
      chai.assert.isDefined(removedMembership);
      chai.assert.equal(removedMembership.role, membership.role);

      const parcel = Parcels.findOne(parcelId);
      chai.assert.isDefined(parcel);
      Parcels.remove(parcelId);
      chai.assert.isUndefined(Parcels.findOne(parcelId));
      const removedParcel = Trash.findOne({ id: parcel._id });
      chai.assert.isDefined(removedParcel);
      chai.assert.equal(removedParcel.ref, parcel.ref);

      const supplier = Partners.findOne(supplierId);
      chai.assert.isDefined(supplier);
      Partners.remove(supplierId);
      chai.assert.isUndefined(Partners.findOne(supplierId));
      const removedPartner = Trash.findOne({ id: supplier._id });
      chai.assert.isDefined(removedPartner);
      chai.assert.deepEqual(removedPartner.idCard, supplier.idCard);

      Meteor.users.remove({ _id: Fixture.dummyUsers[3] });
      chai.assert.isUndefined(Meteor.users.findOne(Fixture.dummyUsers[3]));
      chai.assert.isDefined(Trash.findOne({ id: Fixture.dummyUsers[3] }));

      chai.assert.equal(Trash.find().fetch().length, 4);
      done();
    });

    it('moves deleted topic with its comments to trash', function (done) {
      const topic = Topics.findOne(topicId);
      const comment = Comments.findOne({ topicId });
      chai.assert.isDefined(topic);
      chai.assert.isDefined(comment);
      chai.assert.equal(Comments.find({ topicId }).fetch().length, 3);
      Topics.methods.remove._execute({ userId: topic.creatorId }, { _id: topicId });
      chai.assert.isUndefined(Topics.findOne(topicId));
      const removedTopic = Trash.findOne({ id: topic._id });
      chai.assert.isDefined(removedTopic);
      chai.assert.equal(removedTopic.title, topic.title);
      chai.assert.equal(Comments.find({ topicId }).fetch().length, 0);
      const removedComment = Trash.findOne({ id: comment._id });
      chai.assert.isDefined(removedComment);
      chai.assert.equal(removedComment.text, comment.text);
      chai.assert.equal(Trash.find({ collection: 'comments', topicId }).fetch().length, 3);
      done();
    });

    it('can restore parcel from trash', function (done) {
      const dumpedParcel = Trash.findOne({ collection: 'parcels' });
      const ref = dumpedParcel.ref;
      chai.assert.isUndefined(Parcels.findOne({ communityId, ref }));
      dumpedParcel.restore();
      const restoredParcel = Parcels.findOne({ communityId, ref });
      chai.assert.isDefined(restoredParcel);
      chai.assert.equal(dumpedParcel.lot, restoredParcel.lot);
      chai.assert.equal(dumpedParcel.serial, restoredParcel.serial);
      done();
    });

    it('removes old document from trash after keep-days and keeps others', function (done) {
      const trashCount = Trash.find().fetch().length;
      Clock.setSimulatedTime(moment().subtract(TRASH_KEEP_DAYS + 1, 'days').toDate());
      const oldTicketId = Fixture.builder.create('issue', { creatorId: userId });
      Topics.methods.remove._execute({ userId }, { _id: oldTicketId });
      chai.assert.isDefined(Trash.findOne({ id: oldTicketId }));
      chai.assert.equal(Trash.find().fetch().length, trashCount + 1);
      Clock.setSimulatedTime(moment().subtract(TRASH_KEEP_DAYS - 1, 'days').toDate());
      const notSoOldTopicId = Fixture.builder.create('forum', { creatorId: userId });
      Topics.methods.remove._execute({ userId }, { _id: notSoOldTopicId });
      chai.assert.isDefined(Trash.findOne({ id: notSoOldTopicId }));
      chai.assert.equal(Trash.find().fetch().length, trashCount + 2);
      Clock.clear();
      chai.assert.isDefined(Trash.findOne({ id: oldTicketId }));
      chai.assert.isDefined(Trash.findOne({ id: notSoOldTopicId }));
      emptyOldTrash();
      chai.assert.isUndefined(Trash.findOne({ id: oldTicketId }));
      chai.assert.isDefined(Trash.findOne({ id: notSoOldTopicId }));
      chai.assert.equal(Trash.find().fetch().length, trashCount + 1);
      done();
    });
  });
}
