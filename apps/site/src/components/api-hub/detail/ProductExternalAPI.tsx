import { useTheme } from 'next-themes';

import ScalarDocs from './ScalarDocs';
import { ApiProductExternal, getServerUrls } from '../utils';
import useProductDetail from '@/lib/query/useProductDetail';

const ProductExternalAPI = ({ id }: { id: string }) => {
  const { data } = useProductDetail(id);
  const serverUrls = getServerUrls(data as ApiProductExternal);
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
        sources: data?.raw_openapis?.map((raw) => ({ content: raw })) ?? [],
      }}
    />
  );
};
export default ProductExternalAPI;
