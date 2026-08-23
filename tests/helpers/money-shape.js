// One definition of "this text states a money amount", shared by the two screens
// that need it.
//
// The drafted screen needs it to prove FIN-21 and FIN-30 state no figure at all;
// the FIN-28 tie-out needs it to prove every figure FIN-28 does state is a
// FIN-33 February actual. Those are the same question asked in two directions,
// and they were drifting apart: the tie-out matched only a leading "$", so a
// bare "2,130,335.46" was never compared against anything. A shared shape is
// what stops a document from hiding a figure by omitting the currency symbol.
//
// Deliberately broad, because a false positive here is a sentence an author
// rewrites while a false negative is an unsourced figure that ships.

/** 1,234 / 1,234.56 / $1,234 / $ 1234.56 / 1234.56, with or without the "$". */
const SOURCE = "\\$?\\d{1,3}(?:,\\d{3})+(?:\\.\\d{2})?|\\$\\s?\\d+(?:\\.\\d{2})?|\\b\\d+\\.\\d{2}\\b";

/**
 * A fresh global regex every call. Shared `/g` regexes carry `lastIndex` between
 * callers, and a screen that silently starts halfway through a document is worse
 * than no screen.
 */
export const moneyShape = () => new RegExp(SOURCE, "g");

/** Every money-shaped run in `text`, as written. */
export const moneyMatches = (text) => text.match(moneyShape()) ?? [];

/**
 * The same runs reduced to the ledger's own form: no currency symbol, no
 * grouping, no spaces, so "$2,130,335.46" compares to a FIN-33 `actual_amount`
 * of "2130335.46" without either side being reformatted to meet the other.
 */
export const moneyAmounts = (text) => moneyMatches(text).map((m) => m.replace(/[$,\s]/g, ""));
