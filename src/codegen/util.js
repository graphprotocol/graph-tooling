const disambiguateNames = ({ values, getName, setName }) => {
  let collisionCounter = new Map()
  return values.map((value, index) => {
    let name = getName(value, index)
    let counter = collisionCounter[name]
    if (counter === undefined) {
      collisionCounter[name] = 1
      return setName(value, name)
    } else {
      collisionCounter[name] += 1
      return setName(value, `${name}${counter}`)
    }
  })
}

const unrollTuple = ({ path, index, value }) =>
  value.components
    .map((component, index) => {
      let name = component.name || `value${index}`
      return component.type === 'tuple'
        ? unrollTuple({
            path: [...path, name],
            index,
            value: component,
          })
        : [{ path: [...path, name], type: component.type }]
    })
    .flat()

module.exports = {
  disambiguateNames,
  unrollTuple,
}
