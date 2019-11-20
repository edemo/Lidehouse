import { Template } from 'meteor/templating';
import { Chart } from '/client/plugins/chartJs/Chart.min.js';
import './chart.html';

Template.Chart.onRendered(function () {
  this.chart = null;
  this.autorun(() => {
    const context = this.find('canvas').getContext('2d');
    if (this.chart) { this.chart.destroy(); }
    this.chart = new Chart(context, { type: this.data.type, data: this.data.data, options: this.data.options });
  });
});
