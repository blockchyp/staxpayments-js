/**
 * Copyright 2019-2026 BlockChyp, Inc. All rights reserved. Use of this code is governed
 * by a license that can be found in the LICENSE file.
 *
 * This file was generated automatically by the BlockChyp SDK Generator. Changes to this
 * file will be lost every time the code is regenerated.
 */

/**
 * Maps a Stax Payments charge or preauth request onto the BlockChyp wire model. Fields not
 * listed here carry the same name on both sides and are matched by name; the generated
 * mapper spells every one of them out.
 */
export function authRequestMapper (src) {
  let dst = {}

  dst.tipAmount = src.tipAmount
  dst.taxAmount = src.taxAmount
  dst.terminalName = src.terminalName
  dst.amount = src.amount
  dst.currencyCode = src.currencyCode
  dst.promptForTip = src.promptForTip
  dst.test = src.test
  dst.enroll = src.enroll
  dst.externalPartnerMetadata = src.externalPartnerMetadata
  /**
   * The caller's own reference rides out as externalTransactionRef. BlockChyp's own
   * transactionRef is a different thing: it drives duplicate detection and transaction
   * recall, and carries the Stax transaction id.
   */
  dst.externalTransactionRef = src.transactionRef

  return dst
}

/**
 * Maps a BlockChyp charge or preauth response onto the Stax Payments model. Fields not
 * listed here are matched by name.
 */
export function authResponseMapper (src) {
  let dst = {}

  dst.success = src.success
  dst.error = src.error
  dst.responseDescription = src.responseDescription
  /**
   * The Stax transaction id comes back in the transaction ref. BlockChyp's
   * transactionId is BlockChyp's own id and is deliberately not surfaced.
   */
  dst.transactionId = src.transactionRef
  dst.approved = src.approved
  dst.authCode = src.authCode
  dst.requestedAmount = src.requestedAmount
  dst.authorizedAmount = src.authorizedAmount
  dst.currencyCode = src.currencyCode
  dst.entryMethod = src.entryMethod
  dst.maskedPan = src.maskedPan
  dst.network = src.network
  dst.timestamp = src.timestamp
  dst.status = src.status
  dst.cardMetadata = src.cardMetadata
  dst.receiptSuggestions = src.receiptSuggestions
  dst.test = src.test
  /**
   * The caller's own reference comes back from externalTransactionRef, not from
   * BlockChyp's transactionRef, which carries the Stax transaction id and is surfaced
   * as transactionId.
   */
  dst.transactionRef = src.externalTransactionRef

  return dst
}
