export type WithSavePage<T = object> = T & {
  savePage?: boolean;
};

export type FormLabel = { key: string; value: string }[];
export type APIFormLabel = { [x: string]: string };

export type ConvertLabel<T extends object, R> = Omit<T, 'labels'> & {
  labels?: R;
};
export type ToAPILabel<T extends object> = ConvertLabel<T, APIFormLabel>;
export type ToFormLabel<T extends object> = ConvertLabel<T, FormLabel>;

