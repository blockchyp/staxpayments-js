/**
 * Copyright 2019-2026 BlockChyp, Inc. All rights reserved. Use of this code is governed
 * by a license that can be found in the LICENSE file.
 *
 * This file was generated automatically by the BlockChyp SDK Generator. Changes to this
 * file will be lost every time the code is regenerated.
 */
import axios from 'axios'
import CryptoUtils from './cryptoutils'
import nodeHttps from 'https'
import browserifyHttps from 'https-browserify'
import aesjs from 'aes-js'
import { sha256 } from '@noble/hashes/sha256'
import { randomBytes, bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'

// optionalNodeModule resolves a Node built-in at run time, returning undefined
// in the browser. The name is held in a variable so the browser bundler cannot
// statically resolve it and try to shim it into the bundle.
function optionalNodeModule (name) {
  try {
    if (typeof module !== 'undefined' && typeof module.require === 'function') {
      return module.require(name)
    }
  } catch (e) {
    // Not running under Node.
  }
  return undefined
}

/* eslint-disable no-unused-vars */
export const CardType = Object.freeze({
  CREDIT: 0,
  DEBIT: 1,
  EBT: 2,
  BLOCKCHAIN_GIFT: 3,
  HEALTHCARE: 4,
})

export const SignatureFormat = Object.freeze({
  NONE: '',
  PNG: 'png',
  JPG: 'jpg',
  GIF: 'gif',
})

export const RoundingMode = Object.freeze({
  UP: 'up',
  NEAREST: 'nearest',
  DOWN: 'down',
})

export const PromptType = Object.freeze({
  AMOUNT: 'amount',
  EMAIL: 'email',
  PHONE_NUMBER: 'phone',
  CUSTOMER_NUMBER: 'customer-number',
  REWARDS_NUMBER: 'rewards-number',
  FIRST_NAME: 'first-name',
  LAST_NAME: 'last-name',
})

export const AVSResponse = Object.freeze({
  NOT_APPLICABLE: '',
  NOT_SUPPORTED: 'not_supported',
  RETRY: 'retry',
  NO_MATCH: 'no_match',
  ADDRESS_MATCH: 'address_match',
  POSTAL_CODE_MATCH: 'zip_match',
  ADDRESS_AND_POSTAL_CODE_MATCH: 'match',
})

export const CVMType = Object.freeze({
  SIGNATURE: 'Signature',
  OFFLINE_PIN: 'Offline PIN',
  ONLINE_PIN: 'Online PIN',
  CDCVM: 'CDCVM',
  NO_CVM: 'No CVM',
})

export const HealthcareType = Object.freeze({
  HEALTHCARE: 'healthcare',
  PRESCRIPTION: 'prescription',
  VISION: 'vision',
  CLINIC: 'clinic',
  DENTAL: 'dental',
})
/* eslint-enable no-unused-vars */

const VERSION = require('../package.json').version
const USER_AGENT = `StaxPayments-JavaScript/${VERSION}`
// Some browsers do not allow setting the user-agent header, so we set
// an alternative if running from a browser.
const AGENT_HEADER = (typeof window === 'undefined') ? 'User-Agent' : 'X-Requested-With'

// DEFAULT_CORE_HOST is the default Stax core API host used when none is supplied.
const DEFAULT_CORE_HOST = 'https://apiprod.fattlabs.com'

// TRANSIENT_CREDENTIALS_PATH is the core API path that exchanges a Stax bearer
// token for short-lived Stax Payments transient credentials. This is an
// internal mechanism of the SDK and is never exposed as a public method.
const TRANSIENT_CREDENTIALS_PATH = '/terminals/transient-credentials'

// EXPIRY_SKEW_MS refreshes transient credentials this many milliseconds before
// their stated expiry to avoid a credential lapsing mid-request (clock-skew
// buffer).
const EXPIRY_SKEW_MS = 30 * 1000

// EXPIRY_FALLBACK_MS is how long transient credentials are assumed to live when
// the core API does not state an expiry. The core endpoint does not populate
// expiresAt yet, so in practice this is the credential lifetime.
const EXPIRY_FALLBACK_MS = 8 * 60 * 60 * 1000

// OFFLINE_FIXED_KEY is the static half of the offline route cache key. It is
// hashed together with the current signing key, so a cache file is readable
// only by a client holding the same credentials. It matches the constant used
// by the other Stax Payments SDKs, so the cache format is portable between
// them.
const OFFLINE_FIXED_KEY = 'cb22789c9d5c344a10e0474f134db39e25eb3bbf5a1b1a5e89b507f15ea9519c'

// StaxPaymentsBaseClient holds the shared transport: host configuration,
// transient-credential exchange, and the gateway/dashboard/terminal/core
// request plumbing. Each API namespace ships a client that wraps this base and
// adds only the endpoint methods for that namespace (e.g. PaymentsClient); the
// root StaxPaymentsClient builds one base and shares it across namespaces.
export class StaxPaymentsBaseClient {
  // Construct the shared transport with your Stax bearer token. Terminal
  // transactions transparently exchange it for short-lived transient
  // credentials.
  constructor (creds, opts = {}) {
    this.gatewayHost = opts.gatewayHost || 'https://api.blockchyp.com'
    this.testGatewayHost = 'https://test.blockchyp.com'
    this.dashboardHost = 'https://dashboard.blockchyp.com'
    this.coreHost = opts.coreHost || DEFAULT_CORE_HOST
    this.bearerToken = creds.bearerToken
    // bcCredentials holds the short-lived BlockChyp transient credentials
    // obtained by exchanging the Stax bearer token. SDK-managed; never set by
    // the integrator.
    this.bcCredentials = undefined
    this.bcCredentialsExpiresAtMs = 0
    // Single-flight guard: concurrent callers share one in-flight exchange.
    this.bcCredentialsInFlight = undefined
    this.https = true
    this.cloudRelay = false
    this.routeCacheTTL = 60
    this.gatewayTimeout = 20
    this.terminalTimeout = 120
    this._routeCache = {}
  }

  getGatewayHost () {
    return this.gatewayHost
  }

  getDashboardHost () {
    return this.dashboardHost
  }

  setGatewayHost (host) {
    this.gatewayHost = host
  }

  setDashboardHost (host) {
    this.dashboardHost = host
  }

  setTestGatewayHost (host) {
    this.testGatewayHost = host
  }

  // setCoreHost overrides the Stax core API host. An empty host resets it to the
  // default. Cached credentials remain valid; subsequent exchanges and
  // core-routed calls use the new host.
  setCoreHost (host) {
    this.coreHost = host || DEFAULT_CORE_HOST
  }

  heartbeat () {
    return this._gatewayRequest('get', '/api/heartbeat')
  }

  // routeTransaction runs a transaction end to end, dispatching based on whether
  // a terminal is named: to the terminal (card-present), directly or via cloud
  // relay, when a terminal name is supplied, or to the gateway (card-not-present)
  // otherwise.
  async routeTransaction (method, request, terminalPath, cloudPath) {
    await this.ensure()
    await this._populateSignatureOptions(request)

    let response
    if (this.isTerminalRouted(request)) {
      // A terminal that cannot be routed is an error, not a reason to send the
      // transaction somewhere else: _resolveTerminalRoute throws.
      let route = await this._resolveTerminalRoute(request.terminalName)
      response = route.cloudRelayEnabled
        ? await this._relayRequest(method, cloudPath, request)
        : await this._terminalRequest(method, route, terminalPath, request)
    } else {
      response = await this._gatewayRequest(method, cloudPath, request)
    }

    // routeTransaction resolves to the axios response; the signature lives on
    // the payload.
    await this._handleSignature(request, response ? response.data : undefined)

    return response
  }

  async routeTransactionPost (request, terminalPath, cloudPath) {
    return this.routeTransaction('post', request, terminalPath, cloudPath)
  }

  returnValidationError (desc) {
    let result = {
      data: {
        approved: false,
        success: false,
        error: desc
      }
    }
    return result
  }

  validateRequest (request) {
    if (!this.validateCurrency(request.amount)) {
      return false
    }
    return true
  }

  validateCurrency (val) {
    let amt = parseFloat(val)
    console.log(amt)
    if (amt && !isNaN(amt)) {
      let decMatch = val.match(/\./g || [])
      if (decMatch && decMatch.length > 1) {
        return false
      }
      return true
    }
    return false
  }

  // isTerminalRouted reports whether a request names a terminal. Whether that
  // terminal is reached directly or over cloud relay is a property of its
  // route, resolved per terminal, not a client-wide setting.
  isTerminalRouted (request) {
    return Boolean(request && request.terminalName)
  }

  // ensure guarantees the client holds valid merchant-scoped transient
  // credentials, exchanging the Stax bearer token via the core API when the
  // cache is empty or near expiry. Concurrent callers share one in-flight
  // exchange (single-flight). Terminal calls invoke this before routing.
  async ensure () {
    if (this.bcCredentials && Date.now() + EXPIRY_SKEW_MS < this.bcCredentialsExpiresAtMs) {
      return
    }
    if (this.bcCredentialsInFlight) {
      await this.bcCredentialsInFlight
      return
    }
    this.bcCredentialsInFlight = this._exchange()
    try {
      await this.bcCredentialsInFlight
    } finally {
      this.bcCredentialsInFlight = undefined
    }
  }

  async _exchange () {
    // The cached credentials are left in place until the exchange succeeds. A
    // failed refresh should not discard credentials that may still be usable,
    // and it must not leave the client unauthenticated.
    let response = await this._coreRequest('get', TRANSIENT_CREDENTIALS_PATH)
    let data = response.data
    this.bcCredentials = new StaxPaymentsCredentials(data.apiKey, data.bearerToken, data.signingKey)
    this.bcCredentialsExpiresAtMs = data.expiresAt ? Date.parse(data.expiresAt) : Date.now() + EXPIRY_FALLBACK_MS
  }

  _relayRequest (method, path, request) {
    return this._gatewayRequest(method, path, request, true)
  }

  async _uploadRequest (path, request, content) {
    await this.ensure()
    let config = {
      method: 'post',
      url: this._assembleDashboardUrl(path),
      timeout: this._getTimeout(request, this.gatewayTimeout) * 1000,
      headers: {
        [AGENT_HEADER]: USER_AGENT,
      },
    }

    config.data = content

    if (this.bcCredentials && this.bcCredentials.apiKey) {
      config.headers = Object.assign(config.headers, CryptoUtils.generateGatewayHeaders(this.bcCredentials))
    }
    if (request.fileSize) {
      config.headers['X-File-Size'] = request.fileSize.toFixed()
    }
    if (request.fileName) {
      config.headers['X-Upload-File-Name'] = request.fileName
    }
    if (request.uploadId) {
      config.headers['X-Upload-ID'] = request.uploadId
    }

    return axios(config)
  }

  async _dashboardRequest (method, path, request) {
    await this.ensure()
    let config = {
      method: method,
      url: this._assembleDashboardUrl(path),
      timeout: this._getTimeout(request, this.gatewayTimeout) * 1000,
      headers: {
        [AGENT_HEADER]: USER_AGENT,
        'Content-Type': 'application/json',
      },
    }

    if (method !== 'get') {
      config.data = request
    }

    if (this.bcCredentials && this.bcCredentials.apiKey) {
      config.headers = Object.assign(config.headers, CryptoUtils.generateGatewayHeaders(this.bcCredentials))
    }
    return axios(config)
  }

  async _gatewayRequest (method, path, request, relay) {
    await this.ensure()
    let config = {
      method: method,
      url: this._assembleGatewayUrl(path, request),
      timeout: this._getTimeout(request, relay ? this.terminalTimeout : this.gatewayTimeout) * 1000,
      headers: {
        [AGENT_HEADER]: USER_AGENT,
        'Content-Type': 'application/json',
      },
    }

    if (method !== 'get') {
      config.data = request
    }

    if (this.bcCredentials && this.bcCredentials.apiKey) {
      config.headers = Object.assign(config.headers, CryptoUtils.generateGatewayHeaders(this.bcCredentials))
    }

    return axios(config)
  }

  // _coreRequest sends a request to the Stax core API authenticated with the
  // Stax bearer token. It mirrors _gatewayRequest/_dashboardRequest, differing
  // only in host (coreHost) and auth (the Stax bearer token rather than HMAC
  // credentials). Used by core-routed endpoints and the internal
  // transient-credential exchange.
  _coreRequest (method, path, request) {
    let config = {
      method: method,
      url: this._assembleCoreUrl(path),
      timeout: this._getTimeout(request, this.gatewayTimeout) * 1000,
      headers: {
        [AGENT_HEADER]: USER_AGENT,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
    }

    if (method !== 'get') {
      config.data = request
    }

    return axios(config)
  }

  _getTimeout (request, defaultTimeout) {
    if (request && 'timeout' in request) {
      return request['timeout']
    }

    return defaultTimeout
  }

  _assembleDashboardUrl (path) {
    return this.dashboardHost + path
  }

  _assembleCoreUrl (path) {
    return this.coreHost + path
  }

  _assembleGatewayUrl (path, payload) {
    let result = ''
    if (payload && payload.test) {
      result = result + this.testGatewayHost
    } else {
      result = result + this.gatewayHost
    }
    result = result + path
    return result
  }

  async _terminalRequest (method, route, path, request) {
    let url = await this._assembleTerminalUrl(route, path)

    let config = {
      method: method,
      url: url,
      headers: {
        [AGENT_HEADER]: USER_AGENT,
        'Content-Type': 'application/json',
      },
      timeout: this._getTimeout(request, this.terminalTimeout) * 1000,
    }
    if (this.https) {
      if (nodeHttps) {
        config.httpsAgent = new nodeHttps.Agent({
          rejectUnauthorized: false
        })
      } else {
        config.httpsAgent = new browserifyHttps.Agent({
          rejectUnauthorized: false
        })
        config.httpsAgent.protocol = 'https:'
      }
    }

    if (request) {
      config.data = {
        apiKey: route.transientCredentials.apiKey,
        bearerToken: route.transientCredentials.bearerToken,
        signingKey: route.transientCredentials.signingKey,
        request: request,
      }
    }

    return axios(config)
  }

  _assembleTerminalUrl (route, path) {
    let result = 'http'
    if (this.https) {
      result = result + 's'
    }
    result = result + '://'
    result = result + route.ipAddress
    if (this.https) {
      result = result + ':8443'
    } else {
      result = result + ':8080'
    }
    result = result + path
    return result
  }

  // _populateSignatureOptions infers the signature image format from the
  // requested file extension when the caller did not state one, and rejects a
  // format the terminal cannot produce before the transaction is sent.
  async _populateSignatureOptions (request) {
    if (!request || !request.sigFile) {
      return
    }

    if (!request.sigFormat) {
      let parts = String(request.sigFile).split('.')
      request.sigFormat = parts[parts.length - 1].toLowerCase()
    }

    let valid = [SignatureFormat.NONE, SignatureFormat.PNG, SignatureFormat.JPG, SignatureFormat.GIF]

    if (valid.indexOf(request.sigFormat) < 0) {
      throw new Error('invalid signature format: ' + request.sigFormat)
    }
  }

  // _handleSignature writes the captured signature image to the file the caller
  // asked for and clears it from the response, so the hex payload is not left
  // in an object the caller is likely to log. Writing needs a filesystem, so in
  // the browser the image is left on the response instead.
  async _handleSignature (request, response) {
    if (!request || !request.sigFile || !response || !response.sigFile) {
      return
    }

    let fs = optionalNodeModule('fs')
    if (!fs) {
      return
    }

    let content = Buffer.from(response.sigFile, 'hex')
    response.sigFile = ''

    fs.writeFileSync(request.sigFile, content, { mode: 0o600 })
  }

  // _offlineCacheFile is the path routes are persisted to, or undefined in the
  // browser, where there is nothing to persist to.
  _offlineCacheFile () {
    let os = optionalNodeModule('os')
    let path = optionalNodeModule('path')
    if (!os || !path) {
      return undefined
    }
    return path.join(os.tmpdir(), '.staxpayments_routes')
  }

  // _routeCacheKey scopes a cached route to the credentials that resolved it, so
  // rotating credentials cannot serve a route resolved under the previous set.
  _routeCacheKey (terminalName) {
    return (this.bcCredentials ? this.bcCredentials.apiKey : '') + terminalName
  }

  // _deriveOfflineKey hashes the fixed key together with the current signing
  // key. The cache is therefore readable only while the same credentials are
  // held, and unreadable to anything else that finds the file.
  _deriveOfflineKey () {
    let signingKey = this.bcCredentials ? this.bcCredentials.signingKey : ''
    let input = new Uint8Array([...hexToBytes(OFFLINE_FIXED_KEY), ...hexToBytes(signingKey)])
    return sha256(input)
  }

  // AES/CBC/PKCS7 over the first 16 bytes of the derived key, hex encoded with
  // the IV prefixed. The scheme is shared with the other Stax Payments SDKs.
  _encrypt (value) {
    let key = this._deriveOfflineKey().slice(0, 16)
    let iv = randomBytes(16)
    let cbc = new aesjs.ModeOfOperation.cbc(key, iv)
    let encrypted = cbc.encrypt(aesjs.padding.pkcs7.pad(utf8ToBytes(value)))
    return bytesToHex(iv) + bytesToHex(encrypted)
  }

  _decrypt (value) {
    let key = this._deriveOfflineKey().slice(0, 16)
    let raw = hexToBytes(value)
    let cbc = new aesjs.ModeOfOperation.cbc(key, raw.slice(0, 16))
    let decrypted = aesjs.padding.pkcs7.strip(cbc.decrypt(raw.slice(16)))
    return aesjs.utils.utf8.fromBytes(decrypted)
  }

  _readOfflineCache () {
    let fs = optionalNodeModule('fs')
    let file = this._offlineCacheFile()
    if (!fs || !file) {
      return undefined
    }
    try {
      if (!fs.existsSync(file)) {
        return undefined
      }
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      // An unreadable or corrupt cache is a missing cache, never a failed
      // transaction.
      return undefined
    }
  }

  // _readFromOfflineCache returns a persisted route. Credentials are decrypted
  // on the way out. When stale is false an expired entry is ignored; when true
  // it is served anyway, which is what keeps a terminal reachable while the
  // gateway is not.
  _readFromOfflineCache (terminalName, stale) {
    let cache = this._readOfflineCache()
    if (!cache || !cache.routes) {
      return undefined
    }

    let entry = cache.routes[this._routeCacheKey(terminalName)]
    if (!entry) {
      return undefined
    }

    if (!stale && Date.parse(entry.TTL) <= Date.now()) {
      return undefined
    }

    try {
      let route = entry.Route
      route.transientCredentials = {
        apiKey: this._decrypt(route.transientCredentials.apiKey),
        bearerToken: this._decrypt(route.transientCredentials.bearerToken),
        signingKey: this._decrypt(route.transientCredentials.signingKey)
      }
      return route
    } catch (e) {
      // Written under different credentials, so it cannot be decrypted now.
      return undefined
    }
  }

  _updateOfflineCache (route, ttlMs) {
    let fs = optionalNodeModule('fs')
    let file = this._offlineCacheFile()
    if (!fs || !file) {
      return
    }

    try {
      let cache = this._readOfflineCache() || { routes: {} }
      if (!cache.routes) {
        cache.routes = {}
      }

      cache.routes[this._routeCacheKey(route.terminalName)] = {
        TTL: new Date(ttlMs).toISOString(),
        Route: Object.assign({}, route, {
          transientCredentials: {
            apiKey: this._encrypt(route.transientCredentials.apiKey),
            bearerToken: this._encrypt(route.transientCredentials.bearerToken),
            signingKey: this._encrypt(route.transientCredentials.signingKey)
          }
        })
      }

      fs.writeFileSync(file, JSON.stringify(cache), { mode: 0o600 })
    } catch (e) {
      // Persisting is an optimization; the in-memory cache still stands.
    }
  }

  // _requestRouteFromGateway resolves a route and rejects anything that is not
  // a usable one, so a failed lookup is never cached or routed on.
  async _requestRouteFromGateway (terminalName) {
    let routeResponse = await this._gatewayRequest(
      'get', '/api/terminal-route?terminal=' + encodeURIComponent(terminalName))
    let route = routeResponse.data

    if (!route || route.success === false || !route.ipAddress) {
      throw new Error('unknown terminal: ' + terminalName)
    }

    route.exists = true
    route.https = true

    return route
  }

  async _resolveTerminalRoute (terminalName) {
    let key = this._routeCacheKey(terminalName)
    let cacheEntry = this._routeCache[key]

    if (cacheEntry && cacheEntry.ttl >= new Date().getTime()) {
      return cacheEntry.route
    }

    // An IP address addresses a terminal directly and needs no lookup.
    if ((terminalName.match(/\./g) || []).length === 3) {
      return {
        terminalName: terminalName,
        ipAddress: terminalName,
        cloudRelayEnabled: false,
        exists: true,
        https: false,
        transientCredentials: { apiKey: '', bearerToken: '', signingKey: '' }
      }
    }

    let offline = this._readFromOfflineCache(terminalName, false)
    if (offline) {
      return offline
    }

    let route
    try {
      route = await this._requestRouteFromGateway(terminalName)
    } catch (e) {
      // The gateway is unreachable or does not know the terminal. A stale
      // persisted route is better than no transaction.
      let stale = this._readFromOfflineCache(terminalName, true)
      if (stale) {
        return stale
      }
      throw e
    }

    let ttl = new Date().getTime() + (this.routeCacheTTL * 60000)
    this._routeCache[key] = { ttl: ttl, route: route }
    this._updateOfflineCache(route, ttl)

    return route
  }
}

// StaxApiCredentials is the Stax bearer token used to construct a client. It is
// the only credential an integrator supplies; the BlockChyp gateway credentials
// are obtained and managed internally by the SDK.
export class StaxApiCredentials {
  constructor (bearerToken) {
    this.bearerToken = bearerToken
  }
}

// StaxPaymentsCredentials models the BlockChyp gateway credentials the SDK
// obtains by exchanging the bearer token. It is internal to the SDK.
export class StaxPaymentsCredentials {
  constructor (apiKey, bearerToken, signingKey) {
    this.apiKey = apiKey
    this.bearerToken = bearerToken
    this.signingKey = signingKey
  }
}
