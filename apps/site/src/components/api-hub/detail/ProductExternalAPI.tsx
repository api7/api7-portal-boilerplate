import { useTheme } from 'next-themes';
import { useMemo } from 'react';

import ScalarDocs from './ScalarDocs';
import {
  type ApiProductExternal,
  getOpenAPITitle,
  getServerUrls,
} from '../utils';

const ProductExternalAPI = ({ data }: { data: ApiProductExternal }) => {
  const serverUrls = getServerUrls(data);
  const { resolvedTheme } = useTheme();
  // Scalar derives the downloaded file name from the document title.
  const sources = useMemo(
    () =>
      (data.raw_openapis ?? []).map((raw) => ({
        title: getOpenAPITitle(raw) ?? data.name,
        content: raw,
      })),
    [data.name, data.raw_openapis],
  );
  return (
    <ScalarDocs
      key={resolvedTheme}
      configuration={{
        servers: serverUrls.map((url) => ({ url })),
        hideDarkModeToggle: true,
        darkMode: false,
        defaultOpenAllTags: false,
        forceDarkModeState: resolvedTheme === 'dark' ? 'dark' : 'light',
        sources,
      }}
    />
  );
};
export default ProductExternalAPI;
