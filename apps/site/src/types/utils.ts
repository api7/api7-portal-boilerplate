export type WithSavePage<T = object> = T & {
  savePage?: boolean;
};

export type FormLabel = { key: string; value: string }[];
export type APIFormLabel = { [x: string]: string };

