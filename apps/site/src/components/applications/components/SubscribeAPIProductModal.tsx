'use client';

import { useEffect, useState } from 'react';

import { useCreation, useMemoizedFn } from 'ahooks';
import { Button, Select, Checkbox } from 'antd';
import { toast } from 'sonner';

import IconImage from '@/components/ui/icon-image';
import A7Modal from '@/components/ui/modal';
import { PATH_API_HUB } from '@/constants/path-prefix';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import useProductList from '@/lib/query/useProductList';
import { portalClient } from '@/lib/portal-sdk/client';

type SubscribeAPIProductModalProps = UseDisclosureReturn & {
  applicationId?: string;
  onSuccess?: () => void;
};

const SubscribeAPIProductModal = (props: SubscribeAPIProductModalProps) => {
  const { open, onClose, applicationId, onSuccess } = props;
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get products list with search and pagination
  const productListQuery = useProductList({
    initParams: { application_id: applicationId },
  });

  useEffect(() => {
    if (!open) return;
    setSelectedProducts([]);
    setIsSubmitting(false);
    productListQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId]);

  // Handle search
  const handleSearch = useMemoizedFn((value: string) => {
    productListQuery.onParamsChange({ search: value.trim() });
  });

  // Handle scroll loading
  const handlePopupScroll = useMemoizedFn(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { target } = e;
      const element = target as HTMLDivElement;
      if (element.scrollTop + element.offsetHeight === element.scrollHeight) {
        // Load more when scrolled to bottom
        if (
          productListQuery.data &&
          productListQuery.pagination.total > productListQuery.data.length
        ) {
          const nextPage = productListQuery.pagination.page + 1;
          productListQuery.pagination.goToPage(nextPage);
        }
      }
    }
  );

  // Handle subscription
  const handleSubscribe = useMemoizedFn(async () => {
    if (!applicationId || selectedProducts.length === 0) return;
    setIsSubmitting(true);
    portalClient.subscription
      .bulkSubscribe({
        api_products: selectedProducts,
        applications: [applicationId],
      })
      .then(() => {
        toast.success('Subscribed to API Product Successfully');
        onSuccess?.();
        onClose?.();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  });

  // Handle navigation to product detail
  const handleNavigateToProduct = useMemoizedFn((productId: string) => {
    window.open(`${PATH_API_HUB}/detail?id=${productId}`, '_blank');
  });

  // Prepare options for Select component
  const selectOptions = useCreation(() => {
    return productListQuery.data?.map((product) => ({
      value: product.id,
      label: product.name,
      disabled: product.subscription_status !== 'unsubscribed',
      product,
    }));
  }, [productListQuery.data]);

  return (
    <A7Modal
      title="Subscribe to New API Product"
      open={open}
      onCancel={onClose}
      onOk={handleSubscribe}
      okText="Subscribe"
      okButtonProps={{
        disabled: selectedProducts.length === 0 || isSubmitting,
        loading: isSubmitting,
      }}
      width={600}
      destroyOnHidden
    >
      <label className="block text-sm font-medium mb-2">API Product</label>
      <Select
        mode="multiple"
        showSearch
        placeholder="Search and select API products..."
        className="w-full"
        value={selectedProducts}
        onChange={setSelectedProducts}
        onSearch={handleSearch}
        onPopupScroll={handlePopupScroll}
        filterOption={false}
        loading={productListQuery.isLoading}
        maxTagCount="responsive"
        options={selectOptions}
        menuItemSelectedIcon={null}
        optionRender={(option) => {
          const { product, disabled } = option.data || {};
          if (!product) return option.label;
          const isSelected = selectedProducts.includes(product.id);
          const status = product.subscription_status;
          return (
            <div className="flex items-center justify-between w-full py-1">
              <div
                className="flex items-center space-x-3 flex-1 min-w-0"
                data-testid={`option-${product.name}`}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[#A0ABC5] text-xs font-normal">
                      {status === 'wait_for_approval' && 'Pending Approval'}
                      {product.type === 'gateway' &&
                        !product.can_view_unsubscribed &&
                        status === 'unsubscribed' &&
                        'This API product requires approval'}
                      {status === 'subscribed' && 'Subscribed'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToProduct(product.id);
                }}
                className="shrink-0 ml-2"
              >
                <IconImage
                  type="down-arrow"
                  size={24}
                  className="rotate-[-90deg]"
                />
              </Button>
            </div>
          );
        }}
        notFoundContent={
          productListQuery.isLoading ? (
            <div className="text-center py-2">Loading...</div>
          ) : (
            <div className="text-center py-2">No API products found</div>
          )
        }
      />
    </A7Modal>
  );
};

export default SubscribeAPIProductModal;
