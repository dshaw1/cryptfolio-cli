const chai = require('chai');
const {
  readPortfolioData,
  requestCryptoList,
  calculateTotal
} = require('../src/helpers');

const expect = chai.expect;

describe('Helper functions', () => {
  describe('readPortfolioData', () => {
    it('should read the portfolio file and return a formatted array of objects', done => {
      const response = readPortfolioData();
      expect(response).to.be.an('array');
      expect(response[0]).to.be.an('object');
      done();
    });

    it('should return a portfolio array with a length of 3', done => {
      const response = readPortfolioData();
      expect(response).to.have.lengthOf(3);
      done();
    });
  });

  describe('requestCryptoList', () => {
    const portfolio = readPortfolioData();

    it('should request the CoinMarketCap API and return an array of objects', async () => {
      const response = await requestCryptoList(portfolio);
      expect(response).to.be.an('array');
      expect(response[0]).to.be.an('object');
    });

    it('should return an array of objects with added title key-value pairs', async () => {
      const response = await requestCryptoList(portfolio);
      expect(response[0].hasOwnProperty('title')).to.be.true;
      expect(response[0]['title']).to.not.be.undefined;
    });
  });

  describe('calculateTotal', () => {
    const data = [
      {
        symbol: 'XRP',
        value: '$331.01'
      },
      {
        symbol: 'ADA',
        value: '$486.84'
      },
      {
        symbol: 'NANO',
        value: '$904'
      }
    ];

    it('should return an single string value', () => {
      const response = calculateTotal(data);

      expect(response).to.be.a('string');
      expect(response).to.eq('1721.85');
    });
  });
});
