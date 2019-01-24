/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from './breakdowns';
import { TableReport } from './table-report';
import { yearTags, phaseTags } from './breakdowns-utils';

if (Meteor.isServer) {
  let Fixture;
  let breakdown;

  describe('breakdowns', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      const rawBreakdown = {
        name: 'Root',
        communityId: Fixture.demoCommunityId,
        children: [
          { code: '1', name: 'Level1',
            children: [
              { code: '2', name: 'Level2',
                children: [
                { code: 'A', name: 'LeafA' },
                { code: 'B', name: 'LeafB' },
                { code: 'C', name: 'LeafC' },
                ],
              },
              { name: '',
                children: [
                { code: 'D', name: 'LeafD' },
                ],
              },
            ],
          },
          { name: '',
            children: [
              { name: '',
                children: [
                { code: 'E', name: 'LeafE' },
                ],
              },
              { code: '3', name: 'Level3',
                children: [
                { code: 'F', name: 'LeafF' },
                ],
              },
            ],
          },
        ],
      };
      breakdown = Breakdowns._transform(rawBreakdown);
    });

    it('access to leaf names', function () {
      const leafNames = breakdown.leafNames();
      const expectedLeafNames = ['LeafA', 'LeafB', 'LeafC', 'LeafD', 'LeafE', 'LeafF'];
      chai.assert.deepEqual(leafNames, expectedLeafNames);
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

    xit('access to leaf options', function () {
      const leafOptions = breakdown.leafOptions();
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

    it('reports', function () {
      const report = new TableReport();

      report.addTree('cols', {
        field: 'phase',
        values: Breakdowns._transform(phaseTags),
      }, false, false);

      report.addTree('cols', {
        field: 'month',
        values: Breakdowns._transform(yearTags),
      }, true, false);

      report.addTree('rows', {
        field: 'account.Root',
        values: breakdown,
      }, false, false);


    });
  });
}
