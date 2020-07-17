/* eslint-disable no-restricted-syntax */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './lazy-tab.html';

Template.LazyTab.viewmodel({
  tabWasActive: false,
  onRendered(instance) {
    const self = this;
    const tabNode = instance.$('.forDOMTraversing').closest('.tab-pane')[0];
    if (tabNode.classList.contains('active')) self.tabWasActive(true);
    const config = { attributes: true, childList: false, subtree: false, attributeFilter: ['class'] };
    const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
      for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') {
          const classList = mutation.target.className;
          if (classList.includes('active')) {
            self.tabWasActive(true);
            observer.disconnect();
          }
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(tabNode, config);
  },
});
