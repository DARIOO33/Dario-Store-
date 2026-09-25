// Hiding personal details. Used for reviews ("hide my name") and for the public
// tracking page, where a customer's name, phone and address are only ever sent
// to the browser in masked form. `*` stands for a hidden character.

function maskWord(word: string) {
  const letters = Array.from(word);
  if (letters.length <= 2) return `${letters[0]}*`;
  return `${letters[0]}***${letters[letters.length - 1]}`;
}

// "anouar dario" -> "a***r d***o". Keeps the first and last letter of each
// word; very short words keep only their first letter.
export function maskName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? "Anonymous" : words.map(maskWord).join(" ");
}

// "22 123 456" -> "** *** 456": every digit but the last three is hidden.
export function maskPhone(phone: string) {
  const total = phone.replace(/\D/g, "").length;
  const keep = Math.min(3, Math.floor(total / 2));
  let seen = 0;

  return phone
    .trim()
    .replace(/\d/g, (digit) => (++seen > total - keep ? digit : "*"));
}

// "12 Rue de la Kasbah" -> "*** R***e d* l* K***h": words with numbers are
// hidden completely, other words like a name.
export function maskAddress(address: string) {
  return address
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/\d/.test(word) ? "***" : maskWord(word)))
    .join(" ");
}

// "dario@gmail.com" -> "d***@gmail.com"
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}
