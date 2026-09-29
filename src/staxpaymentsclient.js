/**
 * Copyright 2019-2026 BlockChyp, Inc. All rights reserved. Use of this code is governed
 * by a license that can be found in the LICENSE file.
 *
 * This file was generated automatically by the BlockChyp SDK Generator. Changes to this
 * file will be lost every time the code is regenerated.
 */
import {StaxPaymentsBaseClient} from './client'
import {PaymentsClient} from './payments'
import {TerminalsClient} from './terminals'

// StaxPaymentsClient is the root Stax Payments client. It builds the shared
// transport (StaxPaymentsBaseClient) once and exposes each API namespace
// (e.g. payments, terminals) as a property, so a single set of transient
// credentials is fetched, cached, and refreshed across every namespace rather
// than per namespace.
export class StaxPaymentsClient {
  // Construct the root client with your Stax bearer token.
  constructor (creds, opts = {}) {
    this.base = new StaxPaymentsBaseClient(creds, opts)
    this.payments = new PaymentsClient(this.base)
    this.terminals = new TerminalsClient(this.base)
  }

  // heartbeat checks connectivity with the Stax Payments gateway.
  heartbeat () {
    return this.base.heartbeat()
  }

  // Host configuration is shared across every namespace.
  setGatewayHost (host) {
    this.base.setGatewayHost(host)
  }

  getGatewayHost () {
    return this.base.getGatewayHost()
  }

  setTestGatewayHost (host) {
    this.base.setTestGatewayHost(host)
  }

  setDashboardHost (host) {
    this.base.setDashboardHost(host)
  }

  getDashboardHost () {
    return this.base.getDashboardHost()
  }

  setCoreHost (host) {
    this.base.setCoreHost(host)
  }
}
