/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Factory } from 'meteor/dburles:factory';
import { chai } from 'meteor/practicalmeteor:chai';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Comments } from '../../../api/comments/comments';


import { withRenderedTemplate } from '../../test-helpers.js';
import '../comments-item.js';

describe('Comments_item', function () {
  beforeEach(function () {
    Template.registerHelper('_', key => key);
  });

  afterEach(function () {
    Template.deregisterHelper('_');
  });

  it('renders correctly with simple data', function () {
    const comment = Factory.build('comment', { checked: false });
    const data = {
      comment: Comments._transform(comment),
      onEditingChange: () => 0,
    };

    withRenderedTemplate('Comments_item', data, (el) => {
      chai.assert.equal($(el).find('input[type=text]').val(), comment.text);
      chai.assert.equal($(el).find('.topic-item.checked').length, 0);
      chai.assert.equal($(el).find('.topic-item.editing').length, 0);
    });
  });

  it('renders correctly when checked', function () {
    const comment = Factory.build('comment', { checked: true });
    const data = {
      comment: Comments._transform(comment),
      onEditingChange: () => 0,
    };

    withRenderedTemplate('Comments_item', data, (el) => {
      chai.assert.equal($(el).find('input[type=text]').val(), comment.text);
      chai.assert.equal($(el).find('.topic-item.checked').length, 1);
    });
  });

  it('renders correctly when editing', function () {
    const comment = Factory.build('comment');
    const data = {
      comment: Comments._transform(comment),
      editing: true,
      onEditingChange: () => 0,
    };

    withRenderedTemplate('Comments_item', data, (el) => {
      chai.assert.equal($(el).find('input[type=text]').val(), comment.text);
      chai.assert.equal($(el).find('.topic-item.editing').length, 1);
    });
  });
});
