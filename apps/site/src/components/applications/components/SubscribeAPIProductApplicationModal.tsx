import { useCreation, useMemoizedFn } from 'ahooks';
import { InfoIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup } from '@/components/ui/field';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useActiveOrganizationId } from '@/lib/hooks/useActiveOrganizationId';
import { portalClient } from '@/lib/portal-sdk/client';
import useApplicationList from '@/lib/query/useApplicationList';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
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

type Props = UseDisclosureReturn & {
  onSuccess?: () => void;
  productId: string;
};

const SubscribeAPIProductModalApplication = (props: Props) => {
  const { open, onClose, productId, onSuccess } = props;
  const { orgs } = useActiveOrganizationId();
  const orgSlug = orgs?.[0]?.slug ?? null;
  const [selected, setSelected] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevResetKey, setPrevResetKey] = useState({ open, productId });
  if (prevResetKey.open !== open || prevResetKey.productId !== productId) {
    setPrevResetKey({ open, productId });
    setSelected([]);
    setIsSubmitting(false);
  }

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

  // refetch when open or productId changes; query objects are unstable refs so omitted from deps
  useEffect(() => {
    appsReq.refetch();
    subscribedAppsReq.refetch();
    waitingForApprovalAppsReq.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  // Handle subscription
  const handleSubscribe = useMemoizedFn(async () => {
    if (!productId || selected.length === 0) return;
    setIsSubmitting(true);
    try {
      await portalClient.subscription.bulkSubscribe({
        api_products: [productId],
        applications: selected.map((item) => item.value),
      });
      toast.success('Subscribe Application to API Product Successfully');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Failed to subscribe application to API product');
    } finally {
      setIsSubmitting(false);
    }
  });

  // Handle navigation to application detail
  const handleNavigateToApplication = useMemoizedFn((applicationId: string) => {
    if (!orgSlug) return;
    const newWin = window.open(
      `/${orgSlug}${PATH_APPLICATIONS}/${applicationId}`,
      '_blank',
      'noopener,noreferrer',
    );
    if (newWin) newWin.opener = null;
  });

  // Prepare options for Select component
  const selectOptions = useCreation(() => {
    return (
      appsReq.data
        ?.map((data) => {
          const isSubscribed = subscribedAppsReq.data?.find(
            (a) => a.application_id === data.id,
          );
          const isWaitingForApproval = waitingForApprovalAppsReq.data?.find(
            (a) => a.application_id === data.id,
          );
          if (isSubscribed || isWaitingForApproval) return;

          return {
            value: data.id,
            label: data.name,
            data,
            disabled: !!isSubscribed || !!isWaitingForApproval,
            status: 'unsubscribed',
          } satisfies Option;
        })
        .filter((item) => !!item) ?? []
    );
  }, [appsReq.data, subscribedAppsReq.data, waitingForApprovalAppsReq.data]);

  const anchor = useComboboxAnchor();

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose?.()}>
      <DialogTrigger />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Subscribe Application to API Product</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="applications">Applications</Label>
            <Combobox
              multiple
              autoHighlight
              items={selectOptions}
              value={selected}
              onValueChange={setSelected}
            >
              <ComboboxChips ref={anchor} className="w-full">
                <ComboboxValue>
                  {(items) => (
                    <>
                      {items.map((item: Option) => (
                        <ComboboxChip key={item.value}>
                          {item.label}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>
                  No apps are available for subscribing.
                </ComboboxEmpty>
                <ComboboxList>
                  {(item: Option) => (
                    <>
                      <ComboboxItem
                        className="pr-1 [&>span[data-selected]]:hidden"
                        key={item.value}
                        value={item}
                        disabled={item.disabled}
                      >
                        <Item size="xs" className="p-0">
                          <ItemMedia
                            variant="image"
                            className="flex items-center justify-center p-2"
                          >
                            <Checkbox
                              className="text-primary-foreground! **:text-primary-foreground! isolate"
                              checked={selected.some(
                                (s: Option) => s.value === item.value,
                              )}
                            />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{item.label}</ItemTitle>
                            <ItemDescription>{item.value}</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              data-testid={`navigate-to-application-${item.label}`}
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToApplication(item.value);
                              }}
                              className="ml-3 shrink-0"
                            >
                              <InfoIcon color="grey" />
                            </Button>
                          </ItemActions>
                        </Item>
                      </ComboboxItem>
                    </>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" onClick={onClose} />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubscribe}
            disabled={selected.length === 0 || isSubmitting}
          >
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Subscribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscribeAPIProductModalApplication;
