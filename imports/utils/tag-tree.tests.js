/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { TagTree } from './tag-tree';

if (Meteor.isClient) {
  describe('tag tree', function () {
    const testTree = {
      name: 'Name',
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
            { name: '*',
              children: [
              { name: 'LeafD' },
              ],
            },
          ],
        },
        { name: '*',
          children: [
            { name: '*',
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

    it('works', function () {
      const tagTree = new TagTree(testTree);

      const leafs = tagTree.leafs;
      const leafOptions = tagTree.leafOptions();
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
