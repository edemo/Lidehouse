/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { PayAccounts } from './payaccounts';

if (Meteor.isServer) {
  let Fixture;
  let testPayAccount;

  describe('payaccounts', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      testPayAccount = {
        name: 'Root',
        communityId: Fixture.demoCommunityId,
        children: [
          { name: 'Level1',
            children: [
              { name: 'Level2',
                children: [
                { name: 'LeafA' },
                { name: 'LeafB' },
                { name: 'LeafC' },
                ],
              },
              { name: '',
                children: [
                { name: 'LeafD' },
                ],
              },
            ],
          },
          { name: '',
            children: [
              { name: '',
                children: [
                { name: 'LeafE' },
                ],
              },
              { name: 'Level3',
                children: [
                { name: 'LeafF' },
                ],
              },
            ],
          },
        ],
      };
    });

    it('works', function () {
      const id = PayAccounts.insert(testPayAccount);
      const payaccount = PayAccounts.findOne(id);

      const leafNames = payaccount.leafNames();
      const expectedLeafNames = ['LeafA', 'LeafB', 'LeafC', 'LeafD', 'LeafE', 'LeafF'];
      chai.assert.deepEqual(leafNames, expectedLeafNames);
      
      const nodeNames = payaccount.nodeNames();
      const expectedNodeNames = [
        'Root',
        'Level1',
        'Level2',
        'LeafA',
        'LeafB',
        'LeafC',
        'LeafD',  // under Level1
        'LeafE',  // under Root
        'Level3',
        'LeafF',
      ];
      chai.assert.deepEqual(nodeNames, expectedNodeNames);

      const leafOptions = payaccount.leafOptions();
      const expectedLeafOptions = [
        { label: 'Level1/Level2/LeafA', value: 'LeafA' },
        { label: 'Level1/Level2/LeafB', value: 'LeafB' },
        { label: 'Level1/Level2/LeafC', value: 'LeafC' },
        { label: 'Level1/LeafD',        value: 'LeafD' },
        { label: 'LeafE',               value: 'LeafE' },
        { label: 'Level3/LeafF',        value: 'LeafF' },
      ];
      chai.assert.deepEqual(leafOptions, expectedLeafOptions);
    });
  });
}
