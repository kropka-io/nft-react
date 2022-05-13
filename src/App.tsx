import React from 'react';
import logo from './logo.svg';
import './App.css';
import nft from "./nft";
import {Web3States} from "./Web3States";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <Web3States/>
        <button onClick={() => nft.mintAndSell()}> rarible</button>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
