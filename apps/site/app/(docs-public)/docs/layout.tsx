import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { source } from '@/lib/docs/source';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      themeSwitch={{ enabled: false }}
      containerProps={{
        style: {
          '--fd-docs-row-1': 'var(--app-header-height)',
        } as React.CSSProperties,
      }}
    >
      {children}
    </DocsLayout>
  );
}
