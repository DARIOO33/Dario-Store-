// The cart is emptied by the order page, not by the cart page: emptying it before the
// page changes would flash "Your cart is empty". The cart page notes which order it just
// placed; the order page clears the cart once, only for that order (so opening an old
// "thank you" link later never wipes a new cart).
const KEY = "dario-placed-order";

export function rememberPlacedOrder(orderId: string) {
  try {
    sessionStorage.setItem(KEY, orderId);
  } catch {
    // Private mode: the cart simply stays until the customer empties it.
  }
}

export function consumePlacedOrder(orderId: string) {
  try {
    if (sessionStorage.getItem(KEY) !== orderId) return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
