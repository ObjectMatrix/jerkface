'use strict';

const elv = require('elv');

const errors = require('./errors');


const shared = null;
const sharedMsg =
  'The static shared property can only be null or an instance of Container';


class Container {

  constructor() {
    this._bindings = new Map();
    this._singletons = new Map();
  }


  static get shared() { return shared; }
  static set shared(value) {
    if (value !== null && !(value instanceof Container))
      throw new TypeError(sharedMsg);

    shared = value;
  }


  bind() {

  }


  bindAll() {

  }


  resolve() {

  }

}


module.exports = Container;
