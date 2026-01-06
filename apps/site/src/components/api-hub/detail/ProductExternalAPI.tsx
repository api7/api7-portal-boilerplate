import ScalarDocs from './ScalarDocs';
import { ApiProductExternal, getServerUrls } from '../utils';
import { useSearchParams } from 'next/navigation';
import useProductDetail from '@/lib/query/useProductDetail';

const ProductExternalAPI = () => {
  const product_id = useSearchParams().get('id')!;
  const { data } = useProductDetail(product_id);
  const serverUrls = getServerUrls(data as ApiProductExternal);
  return (
    <ScalarDocs
      configuration={{
        servers: serverUrls.map((url) => ({ url })),
        hideDarkModeToggle: true,
        darkMode: false,
        defaultOpenAllTags: false,
        forceDarkModeState: 'light',
        content: data?.raw_openapis?.[0],
      }}
    />
  );
};
export default ProductExternalAPI;
