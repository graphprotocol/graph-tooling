const debugFactory = require('debug')

debugFactory.formatters.L = immutableList => {
  return JSON.stringify(immutableList)
}

debugFactory.formatters.M = immutableMap => {
  if (immutableMap.toMap != null) {
    return JSON.stringify(immutableMap.toMap())
  }

  return immutableMap
}

module.exports = debugFactory
