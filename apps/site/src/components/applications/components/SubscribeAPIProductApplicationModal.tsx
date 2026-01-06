import { useEffect, useState } from 'react';

import { useCreation, useMemoizedFn } from 'ahooks';
import { Button, Select, Checkbox } from 'antd';
import { toast } from 'sonner';

import IconImage from '@/components/ui/icon-image';
import A7Modal from '@/components/ui/modal';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import useApplicationList from '@/lib/query/useApplicationList';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  ApplicationListItem,
  SubscriptionStatus,
} from '@/types/portal-sdk';

type Option = {
  value: string;
  label: string;
  data: ApplicationListItem;
  disabled: boolean;
  status: SubscriptionStatus;
};
type OptionRenderProps = {
  option: Option;
  navigateToProduct: (productId: string) => void;
  isSelected: (applicationId: string) => boolean;
};

const OptionRender = (props: OptionRenderProps) => {
  const { option, navigateToProduct, isSelected } = props;
  const { data, disabled, status } = option;
  if (!data) return null;
  return (
    <div className="flex items-center justify-between w-full py-1">
      <div
        className="flex items-center space-x-3! flex-1 min-w-0"
        data-testid={`option-${data.name}`}
      >
        <Checkbox
          checked={isSelected(data.id)}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{data.name}</div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[#A0ABC5] text-xs font-normal">
              {status === 'wait_for_approval' && 'Pending Approval'}
              {status === 'subscribed' && 'Subscribed'}
            </span>
          </div>
        </div>
      </div>
      <Button
        data-testid={`navigate-to-application-${data.name}`}
        type="text"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          navigateToProduct(data.id);
        }}
        className="shrink-0 ml-2"
      >
        <IconImage type="down-arrow" alt="down-arrow" size={24} className="-rotate-90" />
      </Button>
    </div>
  );
};

type Props = UseDisclosureReturn & {
  onSuccess?: () => void;
  productId: string;
};

const SubscribeAPIProductModalApplication = (props: Props) => {
  const { open, onClose, productId, onSuccess } = props;
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get products list with search and pagination
  const appsReq = useApplicationList();

  const subscribedAppsReq = useSubscriptionList({
    api_product_id: productId,
    status: ['subscribed'],
  });
  const waitingForApprovalAppsReq = useSubscriptionList({
    api_product_id: productId,
    status: ['wait_for_approval'],
  });

  // clear state and refetch when open or productId changes
  useEffect(() => {
    setSelected([]);
    setIsSubmitting(false);
    appsReq.refetch();
    subscribedAppsReq.refetch();
    waitingForApprovalAppsReq.refetch();
  }, [open, productId]);

  // Handle search
  const handleSearch = useMemoizedFn((value: string) => {
    appsReq.onParamsChange({ search: value.trim() });
  });

  // Handle scroll loading
  const handlePopupScroll = useMemoizedFn(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { target } = e;
      const element = target as HTMLDivElement;
      if (element.scrollTop + element.offsetHeight === element.scrollHeight) {
        // Load more when scrolled to bottom
        if (appsReq.data && appsReq.pagination.total > appsReq.data.length) {
          const nextPage = appsReq.pagination.page + 1;
          appsReq.pagination.goToPage(nextPage);
        }
      }
    }
  );

  // Handle subscription
  const handleSubscribe = useMemoizedFn(async () => {
    if (!productId || selected.length === 0) return;
    setIsSubmitting(true);
    portalClient.subscription
      .bulkSubscribe({
        api_products: [productId],
        applications: selected,
      })
      .then(() => {
        toast.success('Subscribe API Product to Application Successfully');
        onSuccess?.();
        onClose?.();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  });

  // Handle navigation to product detail
  const handleNavigateToApplication = useMemoizedFn((applicationId: string) => {
    window.open(`${PATH_APPLICATIONS}/detail?id=${applicationId}`, '_blank');
  });

  // Prepare options for Select component
  const selectOptions = useCreation(() => {
    return appsReq.data?.map((data) => {
      const isSubscribed = subscribedAppsReq.data?.find(
        (a) => a.application_id === data.id
      );
      const isWaitingForApproval = waitingForApprovalAppsReq.data?.find(
        (a) => a.application_id === data.id
      );
      return {
        value: data.id,
        label: data.name,
        data,
        disabled: !!isSubscribed || !!isWaitingForApproval,
        status: 'unsubscribed',
        ...(isWaitingForApproval && { status: 'wait_for_approval' }),
        ...(isSubscribed && { status: 'subscribed' }),
      } satisfies Option;
    });
  }, [appsReq.data, subscribedAppsReq.data, waitingForApprovalAppsReq.data]);

  return (
    <A7Modal
      title="Subscribe API Product to Application"
      open={open}
      onCancel={onClose}
      onOk={handleSubscribe}
      okText="Subscribe"
      okButtonProps={{
        disabled: selected.length === 0 || isSubmitting,
        loading: isSubmitting,
      }}
      width={600}
      destroyOnHidden
    >
      <label className="block text-sm font-medium mb-2">Applications</label>
      <Select
        mode="multiple"
        placeholder="Search and select applications..."
        className="w-full"
        value={selected}
        onChange={setSelected}
        showSearch={{
          onSearch: handleSearch,
          filterOption: false,
        }}
        onPopupScroll={handlePopupScroll}
        loading={appsReq.isLoading}
        maxTagCount="responsive"
        options={selectOptions}
        menuItemSelectedIcon={null}
        optionRender={(option) => (
          <OptionRender
            option={option.data}
            navigateToProduct={handleNavigateToApplication}
            isSelected={(applicationId) => selected.includes(applicationId)}
          />
        )}
        notFoundContent={
          <div className="text-center py-2">
            {appsReq.isLoading ? 'Loading...' : 'No applications found'}
          </div>
        }
      />
    </A7Modal>
  );
};

export default SubscribeAPIProductModalApplication;
