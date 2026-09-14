// The SMB pack's rule R-MOCK deny-list: processors, gateways, card networks,
// bank products, authorization codes and instrument numbers, as one
// word-anchored list.
//
// Hoisted here (rather than left inside tests/generators/planted-features.test.js,
// where it originated) so that a second consumer, tests/drafted/smb-c2a-drafted-screen.test.js,
// extends it rather than keeping a second copy that can drift from it. A
// module under tests/helpers/ is imported freely by both a generator-side spot
// check and a drafted screen without either side re-running the other's
// `node:test` registrations, which importing one `.test.js` file from another
// would do.
export const MOCK_VOCABULARY = [
  "stripe", "paypal", "adyen", "braintree", "worldpay", "authorize", "plaid", "square",
  "visa", "mastercard", "amex", "discover", "maestro",
  "ach", "wire", "swift", "iban", "sepa", "bacs", "zelle", "venmo",
  "gateway", "processor", "merchant", "acquirer", "routing", "cvv",
  "card", "cardholder", "last4", "authorization", "auth",
];
