import debugFactory from 'debug';

debugFactory.formatters.L = immutableList => {
  return JSON.stringify(immutableList);
};

debugFactory.formatters.M = immutableMap => {
  if (immutableMap.toMap != null) {
    return JSON.stringify(immutableMap.toMap());
  }

  return immutableMap;
};

export default debugFactory;
