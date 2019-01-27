/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from './breakdowns';
import { sideTags, yearTags, monthTags, yearMonthTags } from './breakdowns-utils';

if (Meteor.isServer) {
  let Fixture;
  let breakdown;

  describe('breakdowns', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
      Breakdowns.remove({});
    });

    describe('api', function () {
      before(function () {
        const rootId = Breakdowns.define({
          name: 'Root',
          children: [
            { digit: '1', name: 'Level1',
              children: [
                { digit: '2', name: 'Level2',
                  children: [
                  { digit: 'A', name: 'LeafA' },
                  { digit: 'B', name: 'LeafB' },
                  { digit: 'C', name: 'LeafC' },
                  ],
                },
                { name: '',
                  children: [
                  { digit: 'D', name: 'LeafD' },
                  ],
                },
              ],
            },
            { name: '',
              children: [
                { name: '',
                  children: [
                  { digit: 'E', name: 'LeafE' },
                  ],
                },
                { digit: '3', name: 'Level3',
                  children: [
                  { digit: 'F', name: 'LeafF' },
                  ],
                },
              ],
            },
          ],
        });
        breakdown = Breakdowns.findOne(rootId);
      });

      it('access to leaf names', function () {
        const leafNames = breakdown.leafNames();
        const expectedLeafNames = ['LeafA', 'LeafB', 'LeafC', 'LeafD', 'LeafE', 'LeafF'];
        chai.assert.deepEqual(leafNames, expectedLeafNames);
      });

      it('access to leaf paths', function () {
        const leafPaths = breakdown.leafs().map(l => l.path);
        const expectedLeaPaths = [
          ['Root', 'Level1', 'Level2', 'LeafA'],
          ['Root', 'Level1', 'Level2', 'LeafB'],
          ['Root', 'Level1', 'Level2', 'LeafC'],
          ['Root', 'Level1', 'LeafD'],
          ['Root', 'LeafE'],
          ['Root', 'Level3', 'LeafF'],
        ];
        chai.assert.deepEqual(leafPaths, expectedLeaPaths);
      });

      it('access to node names', function () {
        const nodeNames = breakdown.nodeNames();
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
      });

      it('access to leaf codes', function () {
        const leafCodes = breakdown.leafCodes();
        const expectedLeafCodes = ['12A', '12B', '12C', '1D', 'E', '3F'];
        chai.assert.deepEqual(leafCodes, expectedLeafCodes);
      });

      it('access to leaf options', function () {
        const leafOptions = breakdown.leafOptions();
        const expectedLeafOptions = [
          { label: 'Root:Level1:Level2:LeafA', value: '12A' },
          { label: 'Root:Level1:Level2:LeafB', value: '12B' },
          { label: 'Root:Level1:Level2:LeafC', value: '12C' },
          { label: 'Root:Level1:LeafD',        value: '1D' },
          { label: 'Root:LeafE',               value: 'E' },
          { label: 'Root:Level3:LeafF',        value: '3F' },
        ];
        chai.assert.deepEqual(leafOptions, expectedLeafOptions);
      });
    });

    describe('construction', function () {
      before(function () {
        Breakdowns.define({
          digit: '2', name: 'includeLevel2',
            children: [
            { digit: 'A', name: 'LeafA' },
            { digit: 'B', name: 'LeafB' },
            { digit: 'C', name: 'LeafC' },
            ],
        });

        Breakdowns.define({
          digit: '3', name: 'includeSub',
          children: [
            { digit: '1', name: 'Leaf1' },
            { digit: '2', name: 'Types', include: 'includeTypes' },
          ],
        });

        Breakdowns.define({
          digit: 'D', name: 'includeLeafD',
        });

        Breakdowns.define({
          digit: '1', name: 'includeLevel1',
          children: [
            { digit: '2', name: 'Level2',
              include: 'includeLevel2',
            },
            { name: '',
              children: [
              { digit: 'D', name: 'LeafD', include: 'includeLeafD' },
              ],
            },
          ],
        });

        const assemblyId = Breakdowns.define({
          name: 'Assembly',
          children: [
            { name: 'Level1',
              include: 'includeLevel1',
            },
            { name: '',
              children: [
                { name: '',
                  children: [
                  { digit: 'E', name: 'LeafE' },
                  ],
                },
                { digit: '3', name: 'Level3',
                  children: [
                  { digit: 'F', name: 'LeafF' },
                  ],
                },
              ],
            },
          ],
        });

        breakdown = Breakdowns.findOne(assemblyId);
      });

      it('assembles included parts', function () {
        const yearMonthBreakdown = Breakdowns._transform(yearMonthTags);
        console.log(yearMonthBreakdown.leafOptions());
      });

      it('assembles imported parts', function () {
        console.log(breakdown.leafOptions());
        const root = Breakdowns.findOneByName('Root'); root.name = 'Assembly';
        chai.assert.deepEqual(breakdown.leafOptions(), root.leafOptions());
      });
    });
  });
}
