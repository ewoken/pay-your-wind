const fs = require('fs');
const moment = require('moment-timezone');
const { uniq, flatten, capitalize } = require('lodash');
const buyObligationPrices = require('./buyObligationPrices.json');

function template({ type, subventionData, priceData, prodData, obligationPrice, color, color2, scales }) {
  const capitalizedType = capitalize(type);
  return `
  <!doctype html>
  <html lang="en">

  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
          integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.min.css" />

      <link rel="stylesheet" href="./style.css">
      <title>French subvention estimation by hour to wind and solar electricity production</title>
  </head>

  <body>
      <div style="width: 800px; height: 600px; margin: 20px 0 0 20px">
        <canvas id="chart" width="100" height="100"></canvas>
        <p class="sources">
          <a href="./index.html">Sources: RTE, EPEX Spot SE, CRE</a>
        </p>
      </div>

      <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.bundle.min.js"></script>
      <script>
        var ctx = document.getElementById('chart').getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [
                  {
                    label: 'FR EPEX Price (€/MWh)',
                    data: JSON.parse('${JSON.stringify(priceData)}'),
                    yAxisID: 'price',
                    type: 'line',
                    fill: false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: 'red',
                    backgroundColor: 'red',
                  },
                  {
                    label: '${capitalizedType} production (MWh)',
                    data: JSON.parse('${JSON.stringify(prodData)}'),
                    type: 'line',
                    fill: false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: '${color2}',
                    backgroundColor: '${color2}',
                    yAxisID: 'production',
                  },
                  {
                    label: '${capitalizedType} subventions (k€/h)',
                    data: JSON.parse('${JSON.stringify(subventionData)}'),
                    backgroundColor: '${color}',
                    yAxisID: 'subvention',
                  },
                  {
                    label: 'Average buy price of ${type} (€/MWh)',
                    data: JSON.parse('${JSON.stringify(obligationPrice)}'),
                    yAxisID: 'price',
                    type: 'line',
                    fill: false,
                    pointRadius: 0,
                    showLine: true,
                    borderColor: 'grey',
                    backgroundColor: 'grey',
                  },
                ]
            },
            options: {
                scales: {
                  xAxes: [{
                    type: 'time',
                    time: {
                      unit: 'day',
                      tooltipFormat: 'dd DD-MM-YYYY HH:mm'
                    }
                  }],
                  yAxes: [
                    {
                      id: 'subvention',
                      position: 'left',
                      type: 'linear',
                      ticks: {
                        beginAtZero: true,
                        min: ${scales[0][0]},
                        max: ${scales[0][1]},
                      },
                      scaleLabel: {
                        display: true,
                        labelString: 'Subventions per hour (k€/h)'
                      }
                    },
                    {
                      id: 'price',
                      position: 'right',
                      type: 'linear',
                      ticks: {
                        beginAtZero: true,
                        min: ${scales[1][0]},
                        max: ${scales[1][1]},
                      },
                      scaleLabel: {
                        display: true,
                        labelString: 'Price (€/MWh)'
                      }
                    },
                    {
                      id: 'production',
                      display: false,
                      position: 'right',
                      type: 'linear',
                      ticks: {
                        beginAtZero: true,
                        min: ${scales[2][0]},
                        max: ${scales[2][1]},
                      }
                    }
                  ]
                },
                tooltips: {
                  mode: 'index',
                }
            }
        });
      </script>
  </body>

  </html>
  `
}

function generateChart(type, { color, color2, scales }) {
  const lastWeekStart = moment().tz('Europe/Paris').subtract(1, 'week').startOf('week');
  const lastWeekEnd = moment().tz('Europe/Paris').startOf('week');
  const years = uniq([lastWeekStart.year(), lastWeekEnd.year()]);

  const data = flatten(years.map(year => JSON.parse(fs.readFileSync(`./data/${year}.json`))))
    .filter(d => moment(d.startDate).tz('Europe/Paris').isBetween(lastWeekStart, lastWeekEnd))

  const subventionData = data.map(d => ({
    x: moment(d.startDate).tz('Europe/Paris').toISOString(),
    y: Math.floor(d[`${type}Subventions_euros`] / 1000),
  }));
  const priceData = data.map(d => ({
    x: moment(d.startDate).tz('Europe/Paris').toISOString(),
    y: d.price_euros_mwh,
  }));
  const prodData = data.map(d => ({
    x: moment(d.startDate).tz('Europe/Paris').toISOString(),
    y: d[`${type}_mwh`],
  }));
  const obligationPrice = data.map(d => {
    const date = moment(d.startDate).tz('Europe/Paris');
    return {
      x: date.toISOString(),
      y: buyObligationPrices[date.year()][`${type}_euros_mwh`],
    };
  })

  const html = template({ type, subventionData, priceData, prodData, obligationPrice, color, color2, scales });

  fs.writeFileSync(`./build/${type}Chart.html`, html);
}

const windScales = [
  [-400, 1200],
  [-40, 120],
  [-6000, 18000]
];
const solarScales = [
  [-500, 2400],
  [-100, 480],
  [-2500, 12000]
];

generateChart('wind', { color: 'rgba(137, 196, 244, 1)', color2: 'rgba(52, 73, 94, 1)', scales: windScales});
generateChart('solar', { color: 'rgba(245, 215, 110, 1)', color2: 'rgba(248, 148, 6, 1)', scales: solarScales });




