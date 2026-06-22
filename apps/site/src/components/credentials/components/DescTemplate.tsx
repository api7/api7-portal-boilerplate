'use client';

type DescItem = {
  key: string;
  label: React.ReactNode;
  children?: React.ReactNode;
  hidden?: boolean;
};

type DescTemplateProps = {
  items?: DescItem[];
};

export const DescTemplate = ({ items = [] }: DescTemplateProps) => (
  <dl className="divide-y divide-border rounded border text-sm">
    {items
      .filter((o) => !o.hidden)
      .map((item) => (
        <div key={item.key} className="grid grid-cols-[160px_1fr]">
          <dt className="bg-muted/60 px-4 py-3 font-medium text-muted-foreground">
            {item.label}
          </dt>
          <dd className="px-3 py-2">{item.children}</dd>
        </div>
      ))}
  </dl>
);
