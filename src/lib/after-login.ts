// "Bring me back here after I log in". The cart stores its path before sending
// people to /login or /register; the /success page reads it and follows it.
// sessionStorage survives the Google redirect, and only same-site paths are
// ever followed.
const KEY = "dario-after-login";

export function rememberAfterLogin(path: string) {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Private mode: they just land on the home page after logging in.
  }
}

export function readAfterLogin() {
  try {
    const path = sessionStorage.getItem(KEY);
    // "/x" only: not "//site" and not "/\site", which browsers also read as another site.
    return path && /^\/(?![/\\])/.test(path) ? path : "/";
  } catch {
    return "/";
  }
}

export function clearAfterLogin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
