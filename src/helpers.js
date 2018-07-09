const axios = require('axios');
const chalk = require('chalk');
const currenciesList = require('./currencies');
const fs = require('fs');
const ora = require('ora');
const path = require('path');
const rl = require('readline');
const Table = require('cli-table2');

module.exports = {
  authoriseCurrency: value => {
    const currency = value.toUpperCase();
    const currencyIndex = currenciesList.findIndex(c => c.name === currency);
    if (currencyIndex === -1) {
      console.log(
        'Currency is not supported. Please select one from the available list.'
      );
      return process.exit();
    }
    return currenciesList[currencyIndex];
  },
  calculateTotal: cryptos => {
    let valueArr = [];
    cryptos.map(crypto => {
      valueArr.push(parseFloat(crypto.value.slice(1, crypto.value.length)));
    });
    valueArr = valueArr.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    });
    return valueArr.toFixed(2);
  },
  clearTerminal: () => {
    return process.stdout.write('\033c');
  },
  determineColour: string => {
    if (string.includes('-')) {
      return chalk.red(string);
    } else {
      return chalk.green(` ${string}`);
    }
  },
  handleDecimalPlaces: value => {
    const firstChar = value.toString().charAt(0);
    if (firstChar === '0' || firstChar === '.') {
      return value.toFixed(4);
    } else {
      return value.toFixed(2);
    }
  },
  handleUserInterval: interval => {
    if (isNaN(interval)) {
      console.log('Interval must be a number value.');
      process.exit();
    } else {
      return interval;
    }
  },
  readPortfolioData: () => {
    try {
      const data = fs.readFileSync(process.env['HOME'] + '/.cryptfolio/portfolio.json');
      return Object.entries(JSON.parse(data)).map(item => {
        const portfolioData = {
          name: item[0].toUpperCase(),
          amount: item[1]
        };
        return portfolioData;
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('\nFile: portfolio.json not found!');
        console.log(`Path searched: ${err.path}\n`);
      } else {
        throw err;
      }
      process.exit();
    }
  },
  renderTableHeader: () => {
    return {
      symbol: chalk.underline.bold('SYMBOL'),
      name: chalk.underline.bold('NAME'),
      price: chalk.underline.bold('PRICE'),
      amount: chalk.underline.bold('AMOUNT'),
      value: chalk.underline.bold('VALUE'),
      change_24h: chalk.underline.bold('24H CHANGE'),
      market_cap: chalk.underline.bold('MARKET CAP')
    };
  },
  requestCryptoList: async portfolio => {
    try {
      const arr = [];
      const response = await axios.get(
        'https://api.coinmarketcap.com/v2/listings'
      );

      response.data.data.map(item => {
        portfolio.map(p => {
          if (item.symbol === p.name.toString()) {
            arr.push({ name: p.name, amount: p.amount, title: item.name });
          }
        });
      });
      return arr;
    } catch (err) {
      rl.clearLine(process.stdout, 0);
      rl.cursorTo(process.stdout, 0, null);
      console.log(
        `There was an error attempting to call the CoinMarketCap API.
        \nURL Requested: https://api.coinmarketcap.com/v2/listings/\n`
      );
      process.exit();
    }
  },
  requestRateLimitData: async () => {
    try {
      const response = await axios.get(
        'https://min-api.cryptocompare.com/stats/rate/limit'
      );
      rl.clearLine(process.stdout, 0);
      rl.cursorTo(process.stdout, 0, null);
      console.log(chalk.bold('API calls remaining:'));
      console.log(`This hour: ${response.data.Hour.CallsLeft.Price}`);
      console.log(`This minute: ${response.data.Minute.CallsLeft.Price}`);
      console.log(`This second: ${response.data.Second.CallsLeft.Price}\n`);
      process.exit();
    } catch (err) {
      rl.clearLine(process.stdout, 0);
      rl.cursorTo(process.stdout, 0, null);
      console.log(
        `There was an error attempting to call the CoinMarketCap API.
        \nURL Requested: https://min-api.cryptocompare.com/stats/rate/limit\n`
      );
      process.exit();
    }
  },
  setupSpinner: (text, colour, interval) => {
    const spinner = ora(text);
    spinner.color = colour;
    spinner.spinner = {
      interval: interval,
      frames: [
        '.  ',
        '.  ',
        '.. ',
        '.. ',
        '...',
        '...',
        ' ..',
        ' ..',
        '  .',
        '  .',
        '   '
      ]
    };
    return spinner;
  },
  setupTable: data => {
    const table = new Table({
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: ' '
      },
      colWidths: [10, 30, 15, 15, 15, 15, 25],
      style: { 'padding-left': 0, 'padding-right': 0 }
    });
    const { symbol, name, price, amount, value, change_24h, market_cap } = data;
    table.push([symbol, name, price, amount, value, change_24h, market_cap]);
    return table;
  },
  sortByMarketCap: (arr, symbol) => {
    const cleanValue = val => {
      return parseFloat(val.replace(symbol, '').replace(/,/g, ''));
    };
    const sortedArr = arr.sort((a, b) => {
      let aValue = cleanValue(a.market_cap);
      let bValue = cleanValue(b.market_cap);

      if (aValue > bValue) {
        return -1;
      }
      if (aValue < bValue) {
        return 1;
      }
      return 0;
    });
    return sortedArr;
  }
};
