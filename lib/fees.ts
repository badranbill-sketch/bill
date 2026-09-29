export function compareFees(
  principal: number,
  years: number,
  extraFee: number,
) {
  if (
    !Number.isFinite(principal) ||
    principal < 0 ||
    principal > 10000000 ||
    !Number.isInteger(years) ||
    years < 0 ||
    years > 50 ||
    !Number.isFinite(extraFee) ||
    extraFee < 0 ||
    extraFee > 5
  )
    throw new RangeError("Inputs outside illustration limits");
  const rows = Array.from({ length: years + 1 }, (_, year) => ({
    year,
    base: principal * 1.05 ** year,
    extra: principal * (1.05 - extraFee / 100) ** year,
  }));
  const end = rows[years];
  return {
    rows,
    base: end.base,
    extra: end.extra,
    difference: end.base - end.extra,
  };
}
