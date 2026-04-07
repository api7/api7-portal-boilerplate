export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

class BadRequestError extends Error {}

export const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  name: string
) => {
  if (value === null) {
    return fallback;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestError(`${name} must be a positive integer`);
  }

  return Number.parseInt(value, 10);
};
