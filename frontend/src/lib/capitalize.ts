// Capital letters for names typed in lower case: "juan dela cruz" -> "Juan Dela Cruz".

/** Upper-cases the first letter of each word, and after a hyphen or apostrophe; the rest is left as typed. */
export function capitalizeWords(text: string): string {
  return text.replace(
    /(^|[\s'’-])(\p{Ll})/gu,
    (_, before: string, letter: string) => before + letter.toLocaleUpperCase(),
  )
}
