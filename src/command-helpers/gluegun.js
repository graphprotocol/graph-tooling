const fixParameters = (parameters, booleanOptions) => {
  let params = parameters.array

  Object.keys(booleanOptions).forEach(key => {
    if (typeof booleanOptions[key] === 'string') {
      params.unshift(booleanOptions[key])
    }
  })

  return params
}

module.exports = {
  fixParameters,
}
