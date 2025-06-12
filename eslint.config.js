import { sxzz } from '@sxzz/eslint-config'

export default sxzz()
  .overrideRules({
    'jsdoc/check-param-names': [
      'off',
      {
        checkRestProperty: false,
      },
    ],
  })
  .removeRules('unicorn/filename-case')
