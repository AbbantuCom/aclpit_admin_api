/**
 * The password rules and the sentence describing them, kept free of any server
 * import.
 *
 * lib/password.ts pulls in bcryptjs, which cannot be bundled for the browser, but
 * the sign-in screens need to tell people what is required. Defining the rules
 * once here is what stops the hint on screen and the check on the server from
 * drifting apart.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/**
 * At least one symbol — anything that is not a letter, a digit or a space.
 *
 * Spaces are deliberately excluded from counting: "blue garden gate" would
 * otherwise satisfy a naive "non-alphanumeric" test without containing any of
 * the characters people mean by a symbol.
 */
export const SYMBOL_PATTERN = /[^A-Za-z0-9\s]/;

/** Shown next to every password field. */
export const PASSWORD_HINT =
  `At least ${MIN_PASSWORD_LENGTH} characters, including one symbol such as @ # ! or ? — ` +
  'a few ordinary words plus a symbol works well.';
