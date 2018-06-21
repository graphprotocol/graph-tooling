let fs = require('fs-extra')
let immutable = require('immutable')
let yaml = require('js-yaml')

module.exports = class DataSource {
  static load(path) {
    let data = yaml.safeLoad(fs.readFileSync(path, 'utf-8'))
    return immutable.fromJS(data)
  }

  static write(dataSource, path) {
    fs.writeFileSync(path, yaml.safeDump(dataSource.toJS(), { indent: 2 }))
  }
}
