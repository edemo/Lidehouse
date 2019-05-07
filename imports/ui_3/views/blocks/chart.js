import { Template } from 'meteor/templating';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import './chart.html';

Template.Chart.onRendered(function () {
  this.autorun(() => {
    const context = this.find('canvas').getContext('2d');
    new Chart(context, { type: this.data.type, data: this.data.data, options: this.data.options });
  });
});
