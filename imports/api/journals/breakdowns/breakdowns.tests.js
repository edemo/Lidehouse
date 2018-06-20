/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Breakdowns } from './breakdowns';
import { TableReport } from './table-report';
import { yearTags, phaseTags } from './breakdowns-utils';

if (Meteor.isServer) {
  let Fixture;
  let testBreakdown;

  describe('breakdowns', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      testBreakdown = {
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

    it('init', function () {
      const breakdown = Breakdowns._transform(testBreakdown);

      const leafNames = breakdown.leafNames();
      const expectedLeafNames = ['LeafA', 'LeafB', 'LeafC', 'LeafD', 'LeafE', 'LeafF'];
      chai.assert.deepEqual(leafNames, expectedLeafNames);
      
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
        field: 'accounts.Root',
        values: Breakdowns._transform(testBreakdown),
      }, false, false);


    });
  });
}
