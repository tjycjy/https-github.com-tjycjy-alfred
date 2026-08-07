export function censorName(name: string): string {
  return name.replace(/[aeiouAEIOU]/g, (ch) => (ch === ch.toUpperCase() ? 'X' : 'x'));
}

export function censorPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone.replace(/\d/g, '•');
  let seen = 0;
  return phone.replace(/\d/g, (d) => {
    seen++;
    return seen <= 2 || seen > digits.length - 2 ? d : '•';
  });
}
