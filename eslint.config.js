import { sxzz } from '@sxzz/eslint-config'

export default sxzz()
  .overrideRules({
    'jsdoc/check-param-names': {
      checkRestProperty: false,
    },
  })
  .removeRules('unicorn/filename-case')
