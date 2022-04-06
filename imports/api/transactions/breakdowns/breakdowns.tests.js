/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from './breakdowns.js';
import { Localizer } from './localizer.js';
import { SideBreakdown } from './tx-side.js';
import './methods.js';

if (Meteor.isServer) {
  let Fixture;
  let breakdown;

  describe('breakdowns', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
      Breakdowns.remove({});
    });

    describe('api', function () {
      before(function () {
        Breakdowns.define({ communityId: null,
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
        breakdown = Breakdowns.findOne({ communityId: null, name: 'Root' });
      });

      it('access to node names', function () {
        const nodeNames = breakdown.nodeNames(false);
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

      it('access to leaf names', function () {
        const leafNames = breakdown.nodeNames(true);
        const expectedLeafNames = ['LeafA', 'LeafB', 'LeafC', 'LeafD', 'LeafE', 'LeafF'];
        chai.assert.deepEqual(leafNames, expectedLeafNames);
      });

      it('access to leaf codes', function () {
        const leafCodes = breakdown.nodeCodes(true);
        const expectedLeafCodes = ['12A', '12B', '12C', '1D', 'E', '3F'];
        chai.assert.deepEqual(leafCodes, expectedLeafCodes);
      });

      it('access to nodes of sub nodes', function () {
        const leafNames1 = breakdown.nodesOf('1', true).map(n => n.code);
        const expectedLeafNames1 = ['12A', '12B', '12C', '1D'];
        chai.assert.deepEqual(leafNames1, expectedLeafNames1);

        const leafNames12 = breakdown.nodesOf('12', true).map(n => n.code);
        const expectedLeafNames12 = ['12A', '12B', '12C'];
        chai.assert.deepEqual(leafNames12, expectedLeafNames12);
      });

      it('access to leaf paths', function () {
        const leafPaths = breakdown.nodes(true).map(l => l.path);
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

      it('access to leaf options', function () {
        const leafOptions = breakdown.nodeOptions(true);
        const expectedLeafOptions = [
          { label: '12A: LeafA', value: '12A' },
          { label: '12B: LeafB', value: '12B' },
          { label: '12C: LeafC', value: '12C' },
          { label: '1D: LeafD',  value: '1D' },
          { label:  'E: LeafE',  value: 'E' },
          { label: '3F: LeafF',  value: '3F' },
        ];
        chai.assert.deepEqual(leafOptions, expectedLeafOptions);
      });

      it('access to node options', function () {
        const nodeOptions = breakdown.nodeOptions(false);
        const expectedNodeOptions = [
          { label: ': Root',     value: '' },
          { label: '1: Level1',  value: '1' },
          { label: '12: Level2', value: '12' },
          { label: '12A: LeafA', value: '12A' },
          { label: '12B: LeafB', value: '12B' },
          { label: '12C: LeafC', value: '12C' },
          { label: '1D: LeafD',  value: '1D' },
          { label:  'E: LeafE',  value: 'E' },
          { label: '3: Level3',  value: '3' },
          { label: '3F: LeafF',  value: '3F' },
        ];
        chai.assert.deepEqual(nodeOptions, expectedNodeOptions);
      });
    });

    describe('construction', function () {
      before(function () {
        Breakdowns.define({ communityId: null,
          digit: '2', name: 'includeLevel2',
          children: [
            { digit: 'A', name: 'LeafA' },
            { digit: 'B', name: 'LeafB' },
            { digit: 'C', name: 'LeafC' },
          ],
        });

        Breakdowns.define({ communityId: null,
          digit: '3', name: 'includeSub',
          children: [
            { digit: '1', name: 'Leaf1' },
            { digit: '2', name: 'Types', include: 'includeTypes' },
          ],
        });

        Breakdowns.define({ communityId: null,
          digit: 'D', name: 'includeLeafD',
        });

        Breakdowns.define({ communityId: null,
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

        const assemblyId = Breakdowns.define({ communityId: null,
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

        breakdown = Breakdowns.findOne({ communityId: null, name: 'Assembly' });
      });

      it('clones for a community simply renaming it', function () {
        Breakdowns.define({ communityId: null, name: 'Simple', children: [{ digit: '1', name: 'One' }] });
        Breakdowns.define({ communityId: Fixture.demoCommunityId, name: 'DemoSimple', include: 'Simple' });
        const demoSimple = Breakdowns.findOneByName('DemoSimple', Fixture.demoCommunityId);
        chai.assert.deepEqual(demoSimple.nodeOptions(), [
          { label: ': DemoSimple', value: '' },
          { label: '1: One', value: '1' },
        ]);
      });

      it('clones for a community', function () {
        const root = Breakdowns.findOneByName('Root', Fixture.demoCommunityId);
        chai.assert.equal(root.communityId, null);  // it is generic template
        const cloneId = Breakdowns.methods.clone._execute({ userId: Fixture.demoAccountantId }, {
          name: 'Root', communityId: Fixture.demoCommunityId,
        });
        const clone = Breakdowns.findOne(cloneId);
        chai.assert.equal(clone.communityId, Fixture.demoCommunityId);
        chai.assert.equal(clone.name, 'Root');
        const myRoot = Breakdowns.findOneByName('Root', Fixture.demoCommunityId);
        chai.assert.equal(myRoot.communityId, Fixture.demoCommunityId);
        function deleteIrrelevantFields(brd) {
          delete brd.communityId;
          Mongo.Collection.stripAdministrativeFields(brd);
        }
        deleteIrrelevantFields(root);
        deleteIrrelevantFields(myRoot);
        chai.assert.deepEqual(root, myRoot);    // YET the same, other than those

        // but if we modify it, only our copy changes
        Breakdowns.methods.update._execute({ userId: Fixture.demoAccountantId }, {
          _id: cloneId, modifier: { $set: { name: 'MyRoot' } },
        });
        const rootNew = Breakdowns.findOneByName('Root', null);
        const cloneNew = Breakdowns.findOne(cloneId);
        chai.assert.equal(rootNew.name, 'Root');
        chai.assert.equal(cloneNew.name, 'MyRoot');
      });

      it('assembles imported parts', function () {
        Breakdowns.define({ communityId: Fixture.demoCommunityId, name: 'DemoAssembly', include: 'Assembly' });
        const commonRoot = Breakdowns.findOneByName('Root', null);
        const demoHouseRoot = Breakdowns.findOneByName('DemoAssembly', Fixture.demoCommunityId);

        demoHouseRoot.name = 'Root';
        chai.assert.deepEqual(demoHouseRoot.nodeOptions(), commonRoot.nodeOptions());
      });
    });

    describe('generating parcel breakdown', function () {
      before(function () {
      });

      it('works', function () {
        const parcelBreakdown = Localizer.getParcels(Fixture.demoCommunityId);
        console.log(JSON.stringify(parcelBreakdown));
      });
    });
  });
}
