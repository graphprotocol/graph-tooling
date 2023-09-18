import debugFactory from 'debug';

debugFactory.formatters.L = immutableList => {
  return JSON.stringify(immutableList);
};

debugFactory.formatters.M = immutableMap => {
  if (immutableMap?.toMap != null) {
    return JSON.stringify(immutableMap.toMap());
  }

  if (typeof immutableMap?.toJS === 'function') {
    return JSON.stringify(immutableMap.toJS());
  }

  if (typeof immutableMap === 'object') {
    return JSON.stringify(immutableMap);
  }
  return immutableMap;
};

export default debugFactory;
