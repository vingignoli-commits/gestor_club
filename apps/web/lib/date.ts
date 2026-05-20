export function formatDateOnly(value: string | null | undefined) {
  if (!value) return '-';

  const normalized = value.slice(0, 10);

  const parts = normalized.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

export function formatBirthday(value: string | null | undefined) {
  if (!value) return '-';

  const normalized = value.slice(0, 10);

  const parts = normalized.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const [, month, day] = parts;

  return `${day}/${month}`;
}
