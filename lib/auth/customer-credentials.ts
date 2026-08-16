export function customerAuthEmail(phone: string) {
  return `${phone}@customers.sw8.local`;
}

export function customerAuthPassword(surname: string) {
  return `SW8:${surname.trim()}:customer`;
}
