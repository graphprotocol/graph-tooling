let fs = require('fs-extra')
let immutable = require('immutable')
let yaml = require('js-yaml')

module.exports = class Package {
  static load(path) {
    let data = yaml.safeLoad(fs.readFileSync(path, 'utf-8'))
    return immutable.fromJS(data)
  }

  static write(pkg, path) {
    fs.writeFileSync(path, yaml.safeDump(pkg.toJS(), { indent: 2 }))
  }
}
