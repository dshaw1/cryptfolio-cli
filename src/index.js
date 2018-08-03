#!/usr/bin/env node

const program = require('commander');
const axios = require('axios');
const chalk = require('chalk');
const rl = require('readline');
const DraftLog = require('draftlog').into(console);

// Helper methods
const {
  authoriseCurrency,
  calculateTotal,
  clearTerminal,
  determineColour,
  handleDecimalPlaces,
  handleUserInterval,
  readPortfolioData,
  renderTableHeader,
  requestCryptoList,
  requestRateLimitData,
  setupSpinner,
  setupTable,
  sortByMarketCap
} = require('./helpers');

program
  .version('0.0.1', '-v, --version')
  .option(
    '-c, --currency [currency]',
    'enter your preferred currency',
    authoriseCurrency,
    'USD'
  )
  .option(
    '-i, --interval [interval]',
    'enter your preferred API request interval in minutes',
    handleUserInterval,
    2
  )
  .option(
    '-l, --limit [limit]',
    'request your rate limit information from CryptoCompare'
  )
  .parse(process.argv);

// Manage options
program.limit ? requestRateLimitData() : null;
const preferredCurrency = program.currency.name
  ? program.currency.name.toUpperCase()
  : 'USD';
const currencySymbol = program.currency.symbol ? program.currency.symbol : '$';
const preferredInterval = program.interval;

// Clear screen and print program info
clearTerminal();
console.log(chalk.white.bgGreen.bold('CRYPTFOLIO v.0.0.3'));
if (!program.limit) {
  console.log();
  console.log(`Currency: ${preferredCurrency}`);
  console.log(`Polling interval: ${preferredInterval} minutes`);
}

// Setup spinners
const loadingSpinner = setupSpinner('Fetching data', 'white', 100);
const liveSpinner = setupSpinner(null, 'white', 100);

// Check portfolio.json
const portfolio = readPortfolioData();
const targetCryptos = portfolio.map(crypto => [crypto.name]);

const apiEndpoint = 'https://min-api.cryptocompare.com/data';
const requestUrl = `${apiEndpoint}/pricemultifull?fsyms=${targetCryptos.toString()}&tsyms=${preferredCurrency}`;
const request = async cryptoNames => {
  try {
    const response = await axios.get(requestUrl);
    if (response.data.Response === 'Error') {
      rl.clearLine(process.stdout, 0);
      rl.cursorTo(process.stdout, 0, null);
      console.log(
        `There was an error attempting to call the CryptoCompare API.\nURL Requested: ${requestUrl}\n`
      );
      process.exit();
    }

    const cryptoData = [];
    // Match portfolio currencies against API response
    Object.values(response.data.RAW).filter(item => {
      cryptoNames.map(val => {
        let crypto = item[preferredCurrency];
        if (crypto.FROMSYMBOL === val.name || crypto.FROMSYMBOL === val.title) {
          crypto.symbol = val.name;
          crypto.name = val.title;
          crypto.amount = Number(val.amount);
          crypto.price = Number(crypto.PRICE);
          crypto.value = Number(val.amount) * Number(crypto.price);
          crypto.change_24h = crypto.CHANGEPCT24HOUR;
          crypto.market_cap = crypto.MKTCAP.toFixed(0);

          cryptoData.push(renderPortfolioTable(crypto));
        }
      });
    });
    return sortByMarketCap(cryptoData, currencySymbol);
  } catch (error) {
    console.log(JSON.parse(error.code));
    process.exit();
  }
};

const renderPortfolioTable = data => {
  return {
    symbol: `${data.symbol}`,
    name: `${data.name}`,
    price: `${currencySymbol}${data.price.toFixed(2)}`,
    amount: `${handleDecimalPlaces(data.amount)}`,
    value: `${currencySymbol}${data.value.toFixed(2)}`,
    change_24h: determineColour(`${data.change_24h.toFixed(2)}%`),
    market_cap: `${currencySymbol}${parseFloat(data.market_cap).toLocaleString(
      'en-US'
    )}`
  };
};

const toggleSpinners = (start, stop) => {
  stop.stop();
  rl.clearLine(process.stdout, 0);
  rl.cursorTo(process.stdout, 0, null);
  start.start();
};

// Setup editable function constructors
function CryptoRenderer(crypto) {
  this.name = crypto.name;
  const table = setupTable(crypto);
  this.table = console.draft(table.toString());
}

CryptoRenderer.prototype.update = function(crypto) {
  const self = this;
  const table = setupTable(crypto);
  self.table(table.toString());
};

function PortfolioCalculator(value){
  this.total = console.draft(`\n${chalk.bold('TOTAL:', currencySymbol + '' + value)}\n`);
}

PortfolioCalculator.prototype.update = function(value) {
  const self = this;
  self.total(`\n${chalk.bold('TOTAL:', currencySymbol + '' + value)}\n`)
}

console.log();
loadingSpinner.start();

// Call CoinMarketCap API for list of cryptos
// Return new portfolio array with names included
let updatedPortfolio = [];
requestCryptoList(portfolio).then(data => {
  updatedPortfolio = data;
  initialDataRequest();
});

// Create array to store all CryptoRenderer objects
// Array will be looped and each value edited in future requests
let cryptoRows = [];
let portfolioTotal = {};
const initialDataRequest = async () => {
  if (!program.limit) {
    try {
      const data = await request(updatedPortfolio);
      loadingSpinner.stop();
      // Add table header as seperate CryptoRenderer object
      new CryptoRenderer(renderTableHeader());
      data.map(item => {
        cryptoRows.push(new CryptoRenderer(item));
      });
      portfolioTotal = new PortfolioCalculator(calculateTotal(data));
      liveSpinner.start();
    } catch (err) {
      console.log(err);
      process.exit();
    }
  }
};

// Simulate many queue tasks
setInterval(async () => {
  try {
    toggleSpinners(loadingSpinner, liveSpinner);
    const data = await request(updatedPortfolio);
    toggleSpinners(liveSpinner, loadingSpinner);
    data.map(item => {
      cryptoRows.filter(row => {
        if (item.name === row.name) {
          return row.update(item);
        }
      });
    });
    portfolioTotal.update(calculateTotal(data));
  } catch (err) {
    console.log(err);
    process.exit();
  }
}, preferredInterval * 60 * 1000);
