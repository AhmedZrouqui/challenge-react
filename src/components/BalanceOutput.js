import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';
import _ from 'lodash';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

// eslint-disable-next-line no-extend-native
Number.prototype.between = function(start, end, array) {

  //SORT ARRAY BASED ON ACCOUNT NUMBER
  array = array.sort(function(a, b) {
    var keyA = a.ACCOUNT,
      keyB = b.ACCOUNT;
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  })

  start = isNaN(start.valueOf()) ? array[0].ACCOUNT : start
  end = isNaN(end.valueOf()) ? array.slice(-1)[0].ACCOUNT : end

   return this >= start && this <= end;
 };

 // eslint-disable-next-line no-extend-native
 Date.prototype.between = function(start,end, array) {

    //SORT ARRAY BASED ON PERIOD
    array = array.sort(function(a, b) {
      var keyA = new Date(a.PERIOD),
        keyB = new Date(b.PERIOD);
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    })

    start = isNaN(start) ? array[0].PERIOD : start
    end = isNaN(end) ? array.slice(-1)[0].PERIOD : end

  return this >= start && this<= end
 }

export default connect(state => {
  let _balance = {}
  let balance = [];

  const {startAccount, endAccount, startPeriod, endPeriod} = state.userInput

  //filter journal input to match the demanded accounts and period
  const filterJournal = 
  state.journalEntries.filter(item => 
    //between function implemented to Number and Date (check above connect function)
    item.ACCOUNT.between(startAccount, endAccount, state.accounts) 
    && item.PERIOD.between(startPeriod, endPeriod, state.journalEntries))
  
  //filter journal input to match the demanded accounts
  const filterAccounts = state.accounts.filter(acc => acc.ACCOUNT.between(startAccount, endAccount, state.accounts))

  //Group by Account and calculate the account's debit and credit
  filterJournal.forEach((item) => {
    if(_balance.hasOwnProperty(item.ACCOUNT)) {
      _balance[item.ACCOUNT].DEBIT += item.DEBIT
      _balance[item.ACCOUNT].CREDIT += item.CREDIT
    } else{
      //Add the account's infos to the grouped list only if it exists on the account's Input
      if(filterAccounts.filter(({ACCOUNT}) => ACCOUNT === item.ACCOUNT).length)
        _balance[item.ACCOUNT] = {DEBIT: item.DEBIT, CREDIT: item.CREDIT}
    }
  })

  //Creating balance array from the above grouped and summed list
  balance = Object.keys(_balance).map(item => {
      const {LABEL} = filterAccounts.filter(({ACCOUNT}) => ACCOUNT === parseInt(item, 10))[0];
      return({
        ACCOUNT: parseInt(item, 10),
        DESCRIPTION: LABEL,
        DEBIT: _balance[item].DEBIT,
        CREDIT: _balance[item].CREDIT,
        BALANCE:  _balance[item].DEBIT - _balance[item].CREDIT,
      })
    
  })

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);
