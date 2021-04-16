/* eslint-env mocha */
// These are Chimp globals */
/* globals browser assert */

const countTopics = () => {
  browser.waitForVisible('.topic-comment', 5000);
  const elements = browser.elements('.topic-comment');
  return elements.value.length;
};

describe('topic ui', () => {
  beforeEach(() => {
    browser.url('http://localhost:3100');
  });

  it('can create a topic', () => {
    const initialCount = countTopics();

    browser.click('.js-create-topic');

    assert.equal(countTopics(), initialCount + 1);
  });
});
