const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
const Twitter = require('twitter');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { uniq, flatten } = require('lodash');

const HOST = process.env.LOCAL
  ? 'file:///Users/tanguy/Documents/Dev/pay-your-wind/build'
  : 'https://ewoken.github.io/pay-your-wind';

async function getCharts() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 850, height: 850 });

  await page.goto(`${HOST}/windChart.html`, { waitUntil: 'networkidle0' });
  const windChart = await page.screenshot();

  await page.goto(`${HOST}/solarChart.html`, { waitUntil: 'networkidle0' });
  const solarChart = await page.screenshot();

  await browser.close();
  return {
    windChart,
    solarChart,
  }
}

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

function postTweet(tweetInput) {
  return new Promise((resolve, reject) => {
    client.post('statuses/update', tweetInput,  function(error, tweet) {
      if(error) reject(error);
      resolve(tweet)
    });
  })
}

function uploadMedia(media) {
  return new Promise((resolve, reject) => {
    client.post('media/upload', { media }, (error, mediaObject) => {
      if (error) reject(error);
      resolve(mediaObject);
    })
  })
}

function getData() {
  const lastWeekStart = moment().tz('Europe/Paris').subtract(1, 'week').startOf('week');
  const lastWeekEnd = moment().tz('Europe/Paris').startOf('week');
  const years = uniq([lastWeekStart.year(), lastWeekEnd.year()]);
  const yearsData = years.map(year => JSON.parse(fs.readFileSync(`./data/${year}.json`)));

  const weekData = flatten(yearsData)
    .filter(d => moment(d.startDate).tz('Europe/Paris').isBetween(lastWeekStart, lastWeekEnd))
  const prod = weekData.reduce((sum, d) => sum + d.solar_mwh + d.wind_mwh, 0);
  const weekSubventions = weekData.reduce((sum, d) =>
     sum + d.windSubventions_euros + d.solarSubventions_euros, 0);

  return {
    prod,
    weekSubventions,
    startWeek: lastWeekStart,
    endWeek: lastWeekEnd,
  }
}

function t ({ startWeek, endWeek, weekSubventions, prod }) {
  return `Semaine du ${startWeek.format('DD/MM/YY')} au ${endWeek.format('DD/MM/YY')}:
Production éolienne et PV: ${Math.ceil(prod / 1000)} GWh
Subventions: ${Math.ceil(weekSubventions / 10**6)} M€
Effet sur les émissions de gaz à effet de serre: aucun.
Sources: RTE, EPEX Spot, CRE.
https://ewoken.github.io/pay-your-wind
#argentPublic #EnR #transitionEnergetique.`
}

async function main() {
  const { windChart, solarChart } = await getCharts();
  const windMedia = await uploadMedia(windChart);
  const solarMedia = await uploadMedia(solarChart);

  const tweet = {
    status: t(getData()),
    media_ids: `${windMedia.media_id_string},${solarMedia.media_id_string}`
  };
  await postTweet(tweet);
}

main()
.catch(error => {
  console.log(error);
  process.exit(1);
});

