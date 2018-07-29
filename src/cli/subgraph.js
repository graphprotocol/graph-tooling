let fs = require('fs-extra')
let immutable = require('immutable')
let yaml = require('js-yaml')

module.exports = class Subgraph {
  static load(path) {
    let data = yaml.safeLoad(fs.readFileSync(path, 'utf-8'))
    return immutable.fromJS(data)
  }

  static write(subgraph, path) {
    fs.writeFileSync(path, yaml.safeDump(subgraph.toJS(), { indent: 2 }))
  }
}
