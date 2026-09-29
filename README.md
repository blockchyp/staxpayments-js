
# Stax Payments JavaScript SDK

[![Build Status](https://github.com/blockchyp/staxpayments-js/actions/workflows/main.yml/badge.svg)](https://github.com/blockchyp/staxpayments-js/actions/workflows/main.yml)
[![NPM](https://img.shields.io/npm/v/@staxpayments/staxpayments-js)](https://www.npmjs.com/package/@staxpayments/staxpayments-js)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/blockchyp/staxpayments-js/blob/master/LICENSE)

This is the SDK for JavaScript. Like all Stax Payments SDKs, it provides a full
client for the Stax Payments gateway and Stax Payments payment terminals.

This SDK is designed to run in a browser or in Node.js. But given that this library
is designed for direct communication with the gateway and terminals, in browser
use is not recommended because API credentials would be discoverable via browser
developer tools. There are legitimate use cases for in browser use, but they're rare.

## Browser Based Integrations

This library is designed primarily server side use via Node.js. Stax Payments provides
a separate library for public facing web side or e-commerce systems. The Stax Payments
Web Tokenizer uses cross-origin iframes to tokenize payments in the browser, keeping
web based applications out of PCI scope.

[Stax Payments Web Tokenizer on GitHub](https://github.com/blockchyp/staxpayments-tokenizer)

## Installation

The Stax Payments SDK is installable via NPM. Type the following command to add
Stax Payments to your package.json.

```
npm install @staxpayments/staxpayments-js --save
```

## A Simple Example

Running your first transaction is easy. Make sure you have a Stax Payments terminal,
activate it, and obtain a Stax bearer token.

The SDK exposes a single root client, `StaxPaymentsClient`, organized into
namespaces (one per API area) reached as properties — e.g. `client.payments`,
`client.terminals`. The root client builds one shared transport, so a single set
of transient credentials is fetched and reused across every namespace.

```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');

// Construct the root client with your Stax bearer token. Terminal transactions
// (charge, preauth) transparently exchange it for short-lived transient
// credentials, shared across every namespace.
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.payments.charge({
  test: true,
  terminalName: 'Test Terminal',
  amount: '55.00',
})
  .then(function (response) {
    if (response.approved) {
      console.log('Approved');
      console.log(response.transactionId);
      console.log(response.authCode);
      console.log(response.authorizedAmount);
    } else {
      console.log(response.responseDescription);
    }
  })
  .catch(function (error) {
    console.log(error);
  });
```

The response contains all the information you'll need to complete processing
a transaction. Of particular importance is `receiptSuggestions`, which contains
all the fields that are required or recommended for PCI or EMV compliance.

## Stax Payments Models

`charge` and `preauth` take a Stax Payments request and resolve to a Stax
Payments response:

| Model | Purpose |
| ----- | ------- |
| Auth request | Charge and preauth request. Carries the amount, terminal, currency, tip and tax subtotals, and the test flag. |
| Auth response | Charge and preauth response. Carries the approval, transaction id, auth code, authorized and requested amounts, card details such as the masked PAN, entry method and network, and the `receiptSuggestions` needed for PCI and EMV compliance. |

`transactionId` on the response is the Stax transaction id.

Note that these two operations resolve to the response body directly, unlike the
other endpoints in this SDK, which resolve to the full HTTP response and put the
body on `response.data`.



## Additional Documentation

Complete documentation can be found on our [Developer Documentation Portal].

[Developer Documentation Portal]: https://docs.blockchyp.com/

## Authentication

This SDK authenticates with a **Stax bearer token**. Construct a client with your
bearer token and the SDK transparently exchanges it for short-lived BlockChyp
transient credentials — cached and refreshed automatically — whenever you run a
terminal transaction such as `charge` or `refund`. Listing terminals is served
directly by the Stax core API using your bearer token.

## Getting a Developer Kit

In order to test your integration with real terminals, you'll need a BlockChyp
Developer Kit. Our kits include a fully functioning payment terminal with
test pin encryption keys. Every kit includes a comprehensive set of test
cards with test cards for every major card brand and entry method, including
Contactless and Contact EMV and mag stripe cards. Each kit also includes
test gift cards for our blockchain gift card system.

Access to BlockChyp's developer program is currently invite only, but you
can request an invitation by contacting our engineering team at **nerds@blockchyp.com**.

You can also view a number of long form demos and learn more about us on our [YouTube Channel](https://www.youtube.com/channel/UCE-iIVlJic_XArs_U65ZcJg).

## Transaction Code Examples

You don't want to read words. You want examples. Here's a quick rundown of the
stuff you can do with the Stax Payments JavaScript SDK and a few basic examples.

### Payment Endpoints


These are the core payment APIs used to execute and work with payment transactions in BlockChyp.



#### Charge



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

Our most popular transaction executes a standard authorization and capture.
This is the most basic of
basic payment transactions, typically used in conventional retail.

Charge transactions can use a payment terminal to capture a payment or
use a previously enrolled payment token.

**Terminal Transactions**

For terminal transactions, make sure you pass in the terminal name using the `terminalName` property.

**Token Transactions**

If you have a payment token, omit the `terminalName` property and pass in the token with the `token`
property instead.

**Card Numbers and Mag Stripes**

You can also pass in PANs and Mag Stripes, but you probably shouldn't, as this will
put you in PCI scope and the most common vector for POS breaches is keylogging.
If you use terminals for manual card entry, you'll bypass any keyloggers that
might be maliciously running on the point-of-sale system.

**Common Variations**

* **Gift Card Redemption**:  There's no special API for gift card redemption in BlockChyp. Simply execute a plain charge transaction and if the customer swipes a gift card, our terminals will identify the gift card and run a gift card redemption. Also note that if for some reason the gift card's original purchase transaction is associated with fraud or a chargeback, the transaction will be rejected.
* **EBT**: Set the `CardType` field to `BlockChyp.CardType.EBT` to process an EBT SNAP transaction. Note that test EBT transactions always assume a balance of $100.00, so test EBT transactions over that amount may be declined.
* **Cash Back**: To enable cash back for debit transactions, set the `CashBack` field. If the card presented isn't a debit card, the `CashBack` field will be ignored.
* **Manual Card Entry**: Set the `ManualEntry` field to enable manual card entry. Good as a backup when chips and MSR's don't work or for more secure phone orders. You can even combine the `ManualEntry` field with the `CardType` field set to `BlockChyp.CardType.EBT` for manual EBT card entry.
* **Inline Tokenization**: You can enroll the payment method in the token vault inline with a charge transaction by setting the `Enroll` field. You'll get a token back in the response. You can even bind the token to a customer record if you also pass in customer data.
* **Prompting for Tips**: Set the `PromptForTip` field if you'd like to prompt the customer for a tip before authorization. Good for pay-at-the-table and other service related scenarios.
* **Cash Discounting and Surcharging**:  The `Surcharge` and `CashDiscount` fields can be used together to support cash discounting or surcharge problems. Consult the Cash Discount documentation for more details.
* **Cryptocurrency** The `Cryptocurrency` field can be used to switch the standard present card screen to a cryptocurrency screen.  The field value can be `ANY` to enable any supported cryptocurrency or a single currency code such as `BTC` for Bitcoin.



```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.payments.charge({
  test: true,
  terminalName: 'Test Terminal',
  amount: '55.00',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Preauthorization



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

A preauthorization puts a hold on funds and must be captured later.  This is used
in scenarios where the final transaction amount might change.  A common example is 
fine dining, where a tip adjustment is required before final settlement.

Another use case for preauthorization is e-commerce.  Typically, an online order
is preauthorized at the time of the order and then captured when the order ships.

Preauthorizations can use a payment terminal to capture a payment or
use a previously enrolled payment token.

**Terminal Transactions**

For terminal transactions, make sure you pass in the terminal name using the `terminalName` property.

**Token Transactions**

If you have a payment token, omit the `terminalName` property and pass in the token with the `token`
property instead.

**Card Numbers and Mag Stripes**

You can also pass in PANs and Mag Stripes, but you probably shouldn't, as this will
put you in PCI scope and the most common vector for POS breaches is key logging.
If you use terminals for manual card entry, you'll bypass any key loggers that
might be maliciously running on the point-of-sale system.

**Cryptocurrency**

Note that preauths are not supported for cryptocurrency.

**Common Variations**

* **Manual Card Entry**: Set the `ManualEntry` field to enable manual card entry. Good as a backup when chips and MSR's don't work or for more secure phone orders. You can even combine the `ManualEntry` field with `CardType` set to `BlockChyp.CardType.EBT` for manual EBT card entry.
* **Inline Tokenization**: You can enroll the payment method in the token vault in line with a charge transaction by setting the `Enroll` field. You'll get a token back in the response. You can even bind the token to a customer record if you also pass in customer data.
* **Prompting for Tips**: Set the `PromptForTip` field if you'd like to prompt the customer for a tip before authorization. You can prompt for tips as part of a preauthorization, although it's not a very common approach.
* **Cash Discounting and Surcharging**: The `Surcharge` and `CashDiscount` fields can be used together to support cash discounting or surcharge problems. Consult the Cash Discount documentation for more details.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.payments.preauth({
  test: true,
  terminalName: 'Test Terminal',
  amount: '27.00',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response))
  })
.catch(function (error) {
    console.log(error)
  });

```

### Terminal Management Endpoints


These APIs support terminal management functions and additional terminal 
features such as line item display, messages, and interactive prompts.  
These features can be used to extend a point of sale system's functionality.



#### Terminal Ping



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This simple test transaction helps ensure good communication with a payment terminal 
and is usually the first test you'll run in development.

It tests communication with the terminal and returns a positive response if everything
is okay.  It works the same way in local or cloud relay mode.

If you get a positive response, you've successfully verified all of the following:

* The terminal is online.
* There is a valid route to the terminal.
* The API Credentials are valid.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.ping({
  terminalName: 'Test Terminal',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Terminal Locate



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This endpoint returns a terminal's routing and location information.

The result will indicate whether or not the terminal is in cloud relay mode and will
return the local IP address if the terminal is in local mode.

The terminal will also return the public key for the terminal.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.locate({
  terminalName: 'Test Terminal',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Terminal Clear



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API interrupts whatever a terminal may be doing and returns it to the
idle state.





```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.clear({
  test: true,
  terminalName: 'Test Terminal',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Terminal Status



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API returns the current status of a payment terminal.  This is typically used
as a way to determine if the terminal is busy before sending a new transaction.

If the terminal is busy, `idle` will be false and the `status` field will return
a short string that indicates the transaction type currently in progress.  The system
will also return the timestamp of the last status change in the `since` field.

The `cardInSlot` field in the response will indicates whether or not a card is currently in the card reader slot.

If the system is running a payment transaction and you wisely passed in a
Transaction Ref, this API will also return the Transaction Ref of the in progress
transaction.

The table below lists all possible status responses.

| Status Code          | Description                                                                             |
|----------------------|-----------------------------------------------------------------------------------------|
| idle                 | The terminal is idle and ready for transactions.  The default branding is being displayed. |
| activate             | The terminal is in the process of activating and pairing with the merchant account.     |
| balance              | A balance check (EBT or Gift Card) is pending on the terminal.                          |
| boolean-prompt       | A boolean prompt (yes/no) operation is pending on the terminal.                         |      
| signature            | A signature capture is pending.                                                         |
| crypto               | A cryptocurrency transaction is pending.                                                |
| enroll               | A token vault enrollment operation is pending.                                          |
| gift-activate        | A gift card activation operation is in progress.                                        | 
| message              | The terminal is displaying a custom message.                                            |
| charge               | The terminal is executing a charge transaction.                                         |
| preauth              | The terminal is executing a preauth transaction.                                        |
| refund               | The terminal is executing a refund transaction.                                         |
| survey               | The terminal is displaying post transaction survey questions.                           |
| terms-and-conditions | The terminal is pending terms and conditions acceptance and signature.                  |
| text-prompt          | The terminal is awaiting response to a text input prompt.                               |
| txdisplay            | The terminal is displaying transaction and/or line item level details.                  |




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.terminalStatus({
  terminalName: 'Test Terminal',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Capture Signature



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This endpoint captures a written signature from the terminal and returns the
image.

Unlike the Terms & Conditions API, this endpoint performs basic signature
capture with no agreement display or signature archival.

Under the hood, signatures are captured in a proprietary vector format and
must be converted to a common raster format in order to be useful to most
applications.  At a minimum, you must specify an image format using the
`sigFormat` parameter.  Currently, JPG and PNG are supported.

By default, images are returned in the JSON response as hex encoded binary.
You can redirect the binary image output to a file using the `sigFile`
parameter.

You can also scale the output image to your preferred width by
passing in a `sigWidth` parameter.  The image will be scaled to that
width, preserving the aspect ratio of the original image.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.captureSignature({
  terminalName: 'Test Terminal',

  // File format for the signature image.
  sigFormat: BlockChyp.SignatureFormat.PNG,

  // Width of the signature image in pixels.
  sigWidth: 200,
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### New Transaction Display



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API sends totals and line item level data to the terminal.

At a minimum, you should send total information as part of a display request,
including `total`, `tax`, and `subtotal`.

You can also send line item level data and each line item can have a `description`,
`qty`, `price`, and `extended` price.

If you fail to send an extended price, BlockChyp will multiply the `qty` by the
`price`.  However, we strongly recommend you precalculate all the fields yourself
to ensure consistency.  For example, your treatment of floating-point multiplication 
and rounding may differ slightly from BlockChyp's.

**Discounts**

You have the option to show discounts on the display as individual line items
with negative values or you can associate discounts with a specific line item.
You can apply any number of discounts to an individual line item with a description
and amount.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.newTransactionDisplay({
  test: true,
  terminalName: 'Test Terminal',
  transaction: {
    subtotal: '60.00',
    tax: '5.00',
    total: '65.00',
    items: [
      {
        description: 'Leki Trekking Poles',
        price: '35.00',
        quantity: 2,
        extended: '70.00',
        discounts: [
          {
            description: 'memberDiscount',
            amount: '10.00',
          },
        ],
      },
    ],
  },
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Update Transaction Display



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

Similar to *New Transaction Display*, this variant allows developers to update
line item level data currently being displayed on the terminal.

This feature is designed for situations where you want to update the terminal display as
items are scanned.  You'll only have to send information to the
terminal that's changed, which usually means the new line item and updated totals.

If the terminal is not in line item display mode and you invoke this endpoint,
the first invocation will behave like a *New Transaction Display* call.

At a minimum, you should send total information as part of a display request,
including `total`, `tax`, and `subtotal`.

You can also send line item level data and each line item can have a `description`,
`qty`, `price`, and `extended` price.

If you fail to send an extended price, BlockChyp will multiply the `qty` by the
`price`.  However, we strongly recommend you precalculate all the fields yourself
to ensure consistency.  For example, your treatment of floating-point multiplication and rounding
may differ slightly from BlockChyp's.

**Discounts**

You have the option to show discounts on the display as individual line items
with negative values or you can associate discounts with a specific line item.
You can apply any number of discounts to an individual line item with a description
and amount.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.updateTransactionDisplay({
  test: true,
  terminalName: 'Test Terminal',
  transaction: {
    subtotal: '60.00',
    tax: '5.00',
    total: '65.00',
    items: [
      {
        description: 'Leki Trekking Poles',
        price: '35.00',
        quantity: 2,
        extended: '70.00',
        discounts: [
          {
            description: 'memberDiscount',
            amount: '10.00',
          },
        ],
      },
    ],
  },
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Display Message



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API displays a message on the payment terminal.

Just specify the target terminal and the message using the `message` parameter.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.message({
  test: true,
  terminalName: 'Test Terminal',
  message: 'Thank you for your business.',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Boolean Prompt



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API prompts the customer to answer a yes or no question.

You can specify the question or prompt with the `prompt` parameter and
the response is returned in the `response` field.

This can be used for a number of use cases including starting a loyalty enrollment
workflow or customer facing suggestive selling prompts.

**Custom Captions**

You can optionally override the "YES" and "NO" button captions by
using the `yesCaption` and `noCaption` request parameters.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.booleanPrompt({
  test: true,
  terminalName: 'Test Terminal',
  prompt: 'Would you like to become a member?',
  yesCaption: 'Yes',
  noCaption: 'No',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Text Prompt



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API prompts the customer to enter numeric or alphanumeric data.

Due to PCI rules, free-form prompts are not permitted when the response
could be any valid string.  The reason for this is that a malicious
developer (not you, of course) could use text prompts to ask the customer to
input a card number or PIN code.

This means that instead of providing a prompt, you provide a `promptType` instead.

The prompt types currently supported are listed below:

* **phone**: Captures a phone number.
* **email**: Captures an email address.
* **first-name**: Captures a first name.
* **last-name**: Captures a last name.
* **customer-number**: Captures a customer number.
* **rewards-number**: Captures a rewards number.

You can specify the prompt with the `promptType` parameter and
the response is returned in the `response` field.





```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.textPrompt({
  test: true,
  terminalName: 'Test Terminal',

  // Type of prompt. Can be 'email', 'phone', 'customer-number', or
  // 'rewards-number'.
  promptType: BlockChyp.PromptType.EMAIL,
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### List Terminals



* **API Credential Types:** Merchant & Partner
* **Required Role:** Terminal Management

This API returns details about terminals associated with a merchant account.

Status and resource information is returned for all terminals along with a preview of the 
current branding image displayed on the terminal




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.terminals({
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Deactivate Terminal



* **API Credential Types:** Merchant & Partner
* **Required Role:** Terminal Management

This API deactivates a payment terminal.

If the terminal exists and is currently online, it will be removed from the merchant's 
terminal inventory.  The terminal will be remotely cleared and factory reset.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.deactivateTerminal({
  terminalId: '<TERMINAL ID>',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Activate Terminal



* **API Credential Types:** Stax Bearer Token

This API activates a payment terminal.

If successful, the payment terminal will restart, generate new encryption keys, and download any active
branding assets for the merchant account it's been added to.

Activation requests require an activation code and a unique terminal name.  All terminal names must be unique across
a merchant account.

This request is served by the Stax core API, so the merchant is derived from your bearer token and
cannot be overridden.



```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.activateTerminal({
  terminalName: 'Test Terminal',
  activationCode: '<ACTIVATION CODE>',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

#### Reboot Terminal



* **API Credential Types:** Merchant
* **Required Role:** Payment API Access

This API reboots the terminal.




```javascript
let StaxPayments = require('@staxpayments/staxpayments-js');


// construct a client with your Stax bearer token; terminal transactions
// transparently exchange it for short-lived transient credentials
let client = new StaxPayments.StaxPaymentsClient(
  new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>')
);

client.terminals.reboot({
  terminalName: 'Test Terminal',
})
.then(function (response) {
    console.log('Response: ' + JSON.stringify(response.data))
  })
.catch(function (error) {
    console.log(error)
  });

```

### Terms & Conditions Endpoints


Developers can use BlockChyp to display and capture acceptance of contracts or agreements related to transactions.
These agreements can be any long-form contract ranging from rental agreements to HIPPA disclosures.

There are two basic approaches to terms and conditions capture.  Merchants can store contract templates in 
BlockChyp or they can send the full agreement text as part of every API call.  The right approach will largely 
depend on whether or not the system being integrated with BlockChyp already has a mechanism for organizing 
and managing agreements.  For systems that already have this feature built in, it's probably not necessary 
to use Terms and Conditions.

When agreements are displayed on a terminal, the consumer can scroll through and read the entire agreement,
and provide a signature.  Results are returned as part of the API response, but BlockChyp also stores a 
record of the agreement including the signature image, timestamp, and the full text of the agreement that was 
agreed to.

The Terms and Conditions Log APIs can be used to search and retrieve acceptance records.  Those records
can also be linked to a transaction if a transaction id is provided with the original API request.



### Token Management


BlockChyp supports saved payments and recurring payments through the use of tokens.  Tokens can be created
via the Enroll API or the web tokenizer.  Once created, these tokens can be used for subsequent payments 
or associated with customer records as saved payment methods.

Tokens are limited to a single merchant by default, but can be shared across an organization for multi-location 
merchants by special arrangement with BlockChyp.  Contact your BlockChyp rep to setup token sharing.



### Customer Endpoints


These APIs allow developers to create and manage customer records in BlockChyp.  Developers who wish to use
BlockChyp for tokenized recurring payments can use tokens directly if they have their own customer management
system.  However, BlockChyp provides additional tools for managing customers and keeping track of a customer's saved
payment tokens.

In addition, if customer features are used, BlockChyp can detect a payment method associated with an existing
customer, and return customer data with payment transactions.  This can be used as a passive method to detect
repeat customers.



### Survey Reference


These APIs are used to work with post-transaction surveys and survey data.

Merchants can optionally configure scaled (1-5) or yes/no questions that can be presented to consumers
after every approved Charge and Preauth transaction.  Surveys do not require any custom programming and
merchants can simply configure them without the point-of-sale system needing any additional customization.

However, these APIs allow point-of-sale or third-party system developers to integrate survey question configuration
or result visualization into their own systems.



### Media and Branding Control


BlockChyp has a sophisticated terminal media and branding control platform.  Terminals can be configured to
display logos, images, videos, and slide shows when a terminal is idle.  Branding assets can be configured
at the partner, organization, and merchant level with fine-grained hour-by-hour schedules, if desired. 

Conceptually, all branding and media start with the media library.  Merchants, Partners, and Organizations can
upload images or video and build branding assets from uploaded media.

Slide shows can combine images from the media library into a timed loop of repeating images.

Branding Assets can then be used to combine media or slide shows with priority and timing rules to create what 
we call the Terminal Branding Stack.

We call a group of branding assets the *Terminal Branding Stack* because there are implicit rules about which 
branding assets take priority. For example, a merchant with no branding assets configured will inherit the 
branding rules from any organization to which the merchant may belong.  If the merchant doesn't belong to an organization 
or the organization has no branding rules configured, then the system will defer to branding defaults established 
by the point-of-sale or software partner that owns the merchant.

This feature enables partners and organizations (multi-store operators and large national chains) to configure branding
for potentially thousands of terminals from a single interface.

Terminal Branding can also be configured at the individual terminal level and a merchant's terminal fleet 
can be broken into groups and branding configured at the group level.  Branding configured at the terminal
level will always override branding from any higher level group.

The order of priority for the Terminal Branding Stack is given below.

* Terminal
* Terminal Group
* Merchant
* Organization (Region, Chain, etc)
* Partner
* BlockChyp Default Logo



### Merchant Management


These APIs allow partners to manage and configure their merchant portfolios.

Use of these APIs (other than the Merchant Profile API) requires partner scoped API credentials
with special roles and permissions that may require a special arrangement with BlockChyp.

For example, Partners usually can't board merchants directly, but must board merchants using
the standard underwriting process via offer codes and invitations.



### Partner Utilities


These partner only APIs give ISV partners advanced reporting and tools for managing their portfolio.

Most of the APIs below are for portfolio reporting and range from basic partner commission statements
to individual statements with all underlying card brand data.

We also provide a pricing policy API that enables partners to pull down the current pricing rules
in force for any merchant in their portfolio.

<aside class="info">
<b>Currency Data</b>
<p>
All partner APIs return currency and percentage values in two formats: floating point and formatted strings.
</p>
<p>
It's recommended that all developers use the formatted string as this will ensure the most precise values.
Floating point numbers are usually not appropriate for currency or fixed point decimal numbers as
the underlying binary encoding can lead to errors in precision.  We provide floating point values
only as a convenience for developers want to save development time and can live with approximated
values in their use case.
</p>
</aside>







## Running Integration Tests

If you'd like to run the integration tests, create a new file on your system
called `sdk-itest-config.json` with the API credentials you'll be using as
shown in the example below.

```
{
 "gatewayHost": "https://api.blockchyp.com",
 "testGatewayHost": "https://test.blockchyp.com",
 "apiKey": "PZZNEFK7HFULCB3HTLA7HRQDJU",
 "bearerToken": "QUJCHIKNXOMSPGQ4QLT2UJX5DI",
 "signingKey": "f88a72d8bc0965f193abc7006bbffa240663c10e4d1dc3ba2f81e0ca10d359f5"
}
```

This file can be located in a few different places, but is usually located
at `<USER_HOME>/.config/blockchyp/sdk-itest-config.json`. All BlockChyp SDKs
use the same configuration file.

To run the integration test suite via `make`, type the following command:

`make integration`


## Running Integration Tests With Jasmine

If you'd like to bypass make and run the integration test suite directly,
use the following command:

`BC_TEST_DELAY=5 jasmine itest/*Spec.js`

If you'd like to run individual tests, try the following command:

`jasmine itest/TerminalChargeITestSpec.js`

## Contributions

BlockChyp welcomes contributions from the open source community, but bear in mind
that this repository has been generated by our internal SDK Generator tool. If
we choose to accept a PR or contribution, your code will be moved into our SDK
Generator project, which is a private repository.

## License

Copyright BlockChyp, Inc., 2019

Distributed under the terms of the [MIT] license, staxpayments-js is free and open source software.

[MIT]: https://github.com/blockchyp/staxpayments-js/blob/master/LICENSE

## Other SDKs

BlockChyp has officially supported SDKs for eight different development platforms and counting.
Here's the full list with links to their GitHub repositories.

[Go SDK](https://github.com/blockchyp/blockchyp-go)

[Node.js/JavaScript SDK](https://github.com/blockchyp/blockchyp-js)

[Typescript SDK](https://github.com/blockchyp/blockchyp-ts)

[Java SDK](https://github.com/blockchyp/blockchyp-java)

[.net/C# SDK](https://github.com/blockchyp/blockchyp-csharp)

[Ruby SDK](https://github.com/blockchyp/blockchyp-ruby)

[PHP SDK](https://github.com/blockchyp/blockchyp-php)

[Python SDK](https://github.com/blockchyp/blockchyp-python)

[iOS (Objective-C/Swift) SDK](https://github.com/blockchyp/blockchyp-ios)

[Rust SDK](https://github.com/blockchyp/blockchyp-rust)
