'use strict';

const elv = require('elv');

const assert = require('./assert');
const errors = require('./errors');
const Lifetime = require('./lifetime');


const CircularReferenceError = errors.CircularReferenceError;
const ResolveError = errors.ResolveError;


let shared = null;


class Container {

  constructor() {
    this._bindings = new Map();
    this._extendedBindings = new Map();
  }


  _fullDepSet(binding) {
    const dset = new Set(binding.dependencySet);

    for (let i = 0; i < binding.chain.length; i++) {
      const link = binding.chain[i];
      const base = this._extendedBindings.get(link);

      for (let j = 0; j < base.length; j++) {
        const value = base[j];
        dset.add(value.binding);
      }
    }

    return dset;
  }


  _isCircular(name, dependencies) {
    if (dependencies.has(name)) return true;

    for (const dep of dependencies) {
      const next = this._bindings.get(dep);
      if (!elv(next)) continue;
      if (this._isCircular(name, this._fullDepSet(next))) return true;
    }

    return false;
  }


  _isExtensionCircular(impacted) {
    for (let i = 0; i < impacted.length; i++) {
      const base = impacted[i];
      if (this._isCircular(base.name, this._fullDepSet(base.binding)))
        return true;
    }

    return false;
  }


  //
  // PUBLIC INTERFACE
  //


  static get shared() { return shared; }
  static set shared(value) {
    if (value !== null && !(value instanceof Container))
      throw new TypeError('Property shared must be null or Container instance');

    shared = value;
  }


  bind(name, target, options) {
    assert.bindArgs(arguments.length);
    assert.name(name);
    assert.target(target);
    assert.options(name, target, options);

    const ops = elv.coalesce(options, {});

    const binding = {
      Target: target,
      instance: null,
      lifetime: elv.coalesce(ops.lifetime, Lifetime.singleton),
      dependencies: [],
      dependencySet: new Set(),
      params: elv.coalesce(ops.params, []),
      chain: [],
    };

    if (typeof target !== 'function') {
      binding.instance = target;
      binding.Target = null;
      binding.lifetime = null;
      this._bindings.set(name, binding);
      return this;
    }

    const deps = elv.coalesce(ops.dependencies, {});
    const depKeys = Object.keys(deps);

    for (let i = 0; i < depKeys.length; i++) {
      const key = depKeys[i];
      binding.dependencySet.add(key);
      binding.dependencies.push({
        key,
        binding: deps[key],
      });
    }

    for (const entry of this._extendedBindings) {
      const base = entry[0];

      if (!(binding.Target.prototype instanceof base)) continue;

      if (binding.chain.length === 0) {
        binding.chain.push(base);
        continue;
      }

      const ubound = binding.chain.length - 1;

      for (let i = 0; i < binding.chain.length; i++) {
        const link = binding.chain[i];

        if (base.prototype instanceof link) {
          binding.chain.splice(i, 0, base);
          break;
        }

        if (link.prototype instanceof base) {
          if (i < ubound) continue;
          binding.chain.push(base);
        }

        break;
      }
    }

    if (this._isCircular(name, this._fullDepSet(binding)))
      throw new CircularReferenceError(name);

    this._bindings.set(name, binding);

    return this;
  }


  bindAll(base, dependencies) {
    assert.base(base);
    assert.dependencies(dependencies);

    const extended = [];
    const depKeys = Object.keys(dependencies);

    for (let i = 0; i < depKeys.length; i++) {
      const key = depKeys[i];
      extended.push({
        key,
        binding: dependencies[key],
      });
    }

    const impacted = [];

    for (const entry of this._bindings) {
      const name = entry[0];
      const binding = entry[1];

      if (!elv(binding.Target)) continue;

      if (binding.Target === base) {
        if (binding.chain.length === 0 || binding.chain[0] !== base)
          binding.chain.unshift(base);

        impacted.push({
          name,
          binding,
        });
        continue;
      }

      if (!(binding.Target.prototype instanceof base)) continue;

      if (binding.chain.length === 0) {
        binding.chain.unshift(base);
        impacted.push({
          name,
          binding,
        });

        continue;
      }

      const ubound = binding.chain.length - 1;

      for (let i = 0; i < binding.chain.length; i++) {
        const link = binding.chain[i];

        if (base.prototype instanceof link) {
          binding.chain.splice(i, 0, base);
          impacted.push({
            name,
            binding,
          });
          break;
        }

        if (link.prototype instanceof base) {
          if (i < ubound) continue;

          binding.chain.push(base);
          impacted.push({
            name,
            binding,
          });
        }

        break;
      }
    }

    this._extendedBindings.set(base, extended);

    if (this._isExtensionCircular(impacted)) {
      this._extendedBindings.delete(base);
      throw new CircularReferenceError(base.toString());
    }

    return this;
  }


  resolve(name) {
    if (typeof name !== 'string')
      throw new TypeError('Arg name must be string');

    const binding = this._bindings.get(name);

    if (typeof binding === 'undefined')
      throw new ResolveError(name);

    if (binding.instance !== null) return binding.instance;

    const resolvedDeps = {};
    const found = new Set();

    for (let i = 0; i < binding.dependencies.length; i++) {
      const dep = binding.dependencies[i];
      found.add(dep.key);
      resolvedDeps[dep.key] = this.resolve(dep.binding);
    }

    for (let i = 0; i < binding.chain.length; i++) {
      const base = binding.chain[i];
      const ext = this._extendedBindings.get(base);

      if (ext === null || typeof ext === 'undefined') continue;

      for (let j = 0; j < ext.length; j++) {
        const extDep = ext[j];
        if (found.has(extDep.key)) continue;
        found.add(extDep.key);
        resolvedDeps[extDep.key] = this.resolve(extDep.binding);
      }
    }

    const params = binding.params.slice();
    if (found.size > 0) params.push(resolvedDeps);

    let resolved;

    if (params.length === 0) {
      resolved = new binding.Target();
    } else {
      params.unshift(null);
      const Target = binding.Target.bind.apply(binding.Target, params);
      resolved = new Target();
    }

    if (binding.lifetime === Lifetime.transient) return resolved;

    binding.instance = resolved;

    return binding.instance;
  }

}


module.exports = Container;
