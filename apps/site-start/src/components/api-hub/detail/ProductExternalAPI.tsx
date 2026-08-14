import { useTheme } from 'next-themes';

import ScalarDocs from './ScalarDocs';
import { type ApiProductExternal, getServerUrls } from '../utils';

const ProductExternalAPI = ({ data }: { data: ApiProductExternal }) => {
  const serverUrls = getServerUrls(data);
  const { resolvedTheme } = useTheme();
  return (
    <ScalarDocs
      key={resolvedTheme}
      configuration={{
        servers: serverUrls.map((url) => ({ url })),
        hideDarkModeToggle: true,
        darkMode: false,
        defaultOpenAllTags: false,
        forceDarkModeState: resolvedTheme === 'dark' ? 'dark' : 'light',
        sources: data.raw_openapis?.map((raw) => ({ content: raw })) ?? [],
      }}
    />
  );
};
export default ProductExternalAPI;
