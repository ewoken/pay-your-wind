const fs = require('fs');
const BUY_OBLIGATION_PRICES = require('./buyObligationPrices.json');

function template({ years, reports }) {
  return `
  <!doctype html>
  <html lang="en">

  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
          integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">

      <link rel="stylesheet" href="./style.css">
      <title>French subvention estimation by hour to wind and solar electricity production</title>
  </head>

  <body>
      <div class="container-fluid">
          <div class="row justify-content-center">
              <div class="col-10">
                  <div class="jumbotron">
                      <h1 class="display-4">French subventions to wind and solar electric production</h1>
                      <p class="lead"><a href="https://github.com/ewoken/pay-your-wind">GitHub repo</a></p>
                      <hr class="my-4">
                      <p>
                        You can download subvention estimation data in JSON at <code>'./data/YYYY.json'</code> where YYYY is the year you want (ex: <a href="./data/2007.json">./data/2007.json</a>).<br/>
                        You can also download the data in a CSV format below :
                      </p>
                      <div>
                        <div class="dropdown">
                          <button class="btn btn-primary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Download
                          </button>
                          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                            ${years.map(year => `<a class="dropdown-item" href="./data/${year}.csv">${year}.csv</a>`).join('\n')}
                          </div>
                        </div>
                      </div>
                      <div class="reports">
                        <p>
                        Average prices of renewables buying are available in this <a href="./data/buyObligationPrices.json">file</a>.
                        Sources of these prices can be downloaded:
                        </p>
                        <div class="dropdown">
                          <button class="btn btn-primary dropdown-toggle" type="button" id="dropdownMenuButton2" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Download
                          </button>
                          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton2">
                            ${reports.map(report => `<a class="dropdown-item" href="./CRE_reports/${report}">${report}</a>`).join('\n')}
                          </div>
                        </div>
                      </div>
                      <div class="reports">
                        Data are updated everyday.
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
  </body>

  </html>
  `
}

const years = Object.keys(BUY_OBLIGATION_PRICES).map(i => Number(i));
const reports = fs.readdirSync('./CRE_reports');

const html = template({ years, reports });

fs.writeFileSync('./build/index.html', html);
