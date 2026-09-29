import * as base from './client'
import * as root from './staxpaymentsclient'

if (typeof window !== 'undefined') {
  window.staxpayments = { ...base, ...root }
}
