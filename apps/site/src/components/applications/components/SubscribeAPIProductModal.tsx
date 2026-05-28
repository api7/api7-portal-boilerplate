'use client';

import { useEffect, useState } from 'react';

import { useCreation, useMemoizedFn } from 'ahooks';
import { Button, Select, Checkbox } from 'antd';
import { toast } from 'sonner';

import IconImage from '@/components/ui-legacy/icon-image';
import A7Modal from '@/components/ui-legacy/modal';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import useProductList from '@/lib/query/useProductList';
import { portalClient } from '@/lib/portal-sdk/client';

type SubscribeAPIProductModalProps = UseDisclosureReturn & {
  applicationId?: string;
  onSuccess?: () => void;
};

const SubscribeAPIProductModal = (props: SubscribeAPIProductModalProps) => {
  const { open, onClose, applicationId, onSuccess } = props;
  const apiHubBasePath = useApiHubBasePath();
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
    window.open(`${apiHubBasePath}/detail?id=${productId}`, '_blank');
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
        classNames={{ popup: { root: 'subscription-select-popup' } }}
        menuItemSelectedIcon={null}
        optionRender={(option) => {
          const { product, disabled } = option.data || {};
          if (!product) return option.label;
          const isSelected = selectedProducts.includes(product.id);
          const status = product.subscription_status;
          const statusText =
            (status === 'wait_for_approval' && 'Pending Approval') ||
            (product.type === 'gateway' &&
              !product.can_view_unsubscribed &&
              status === 'unsubscribed' &&
              'This API product requires approval') ||
            (status === 'subscribed' && 'Subscribed') ||
            '';
          return (
            <div className="flex w-full items-center justify-between py-2">
              <div
                className="flex min-w-0 flex-1 items-center gap-3"
                data-testid={`option-${product.name}`}
              >
                <div className="flex h-5 w-6 shrink-0 items-center justify-center [&_.ant-checkbox]:top-0!">
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium leading-5 text-primary-content">
                    {product.name}
                  </div>
                  {statusText && (
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-xs font-normal text-[#A0ABC5]">
                        {statusText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToProduct(product.id);
                }}
                className="ml-3 shrink-0"
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
