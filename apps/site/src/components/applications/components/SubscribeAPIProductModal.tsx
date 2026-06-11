'use client';

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
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import useProductList from '@/lib/query/useProductList';
import { ProductListRes } from '@/types/portal-sdk';

type Option = {
  value: string;
  label: string;
  disabled: boolean;
  product: ProductListRes['list'][number];
};

type Props = UseDisclosureReturn & {
  applicationId?: string;
  onSuccess?: () => void;
};

const SubscribeAPIProductModal = (props: Props) => {
  const { open, onClose, applicationId, onSuccess } = props;
  const apiHubBasePath = useApiHubBasePath();
  const [selected, setSelected] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevKey, setPrevKey] = useState({ open, applicationId });
  if (prevKey.open !== open || prevKey.applicationId !== applicationId) {
    setPrevKey({ open, applicationId });
    if (open) {
      setSelected([]);
      setIsSubmitting(false);
    }
  }

  // Get products list with search and pagination
  const productListQuery = useProductList({
    initParams: { application_id: applicationId },
  });

  useEffect(() => {
    if (!open) return;
    productListQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId]);

  // Handle subscription
  const handleSubscribe = useMemoizedFn(async () => {
    if (!applicationId || selected.length === 0) return;
    setIsSubmitting(true);
    try {
      await portalClient.subscription.bulkSubscribe({
        api_products: selected.map((item) => item.value),
        applications: [applicationId],
      });
      toast.success('Subscribed to API Product Successfully');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Failed to subscribe to API product');
    } finally {
      setIsSubmitting(false);
    }
  });

  // Handle navigation to product detail
  const handleNavigateToProduct = useMemoizedFn((productId: string) => {
    const newWin = window.open(
      `${apiHubBasePath}/${productId}`,
      '_blank',
      'noopener,noreferrer',
    );
    if (newWin) newWin.opener = null;
  });

  // Prepare options for Select component
  const selectOptions = useCreation(() => {
    return (
      productListQuery.data
        ?.map((product) => ({
          value: product.id,
          label: product.name,
          disabled: product.subscription_status !== 'unsubscribed',
          product,
        }))
        .filter((product) => product.product.type === 'gateway') ?? []
    );
  }, [productListQuery.data]);

  const anchor = useComboboxAnchor();

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose?.()}>
      <DialogTrigger />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Subscribe to New API Product</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="api_products">API Product</Label>
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
                  No API products are available for subscribing.
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
                            <ItemTitle className="w-62 text-ellipsis">
                              {item.label}
                            </ItemTitle>
                            <ItemDescription className="w-62 text-ellipsis">
                              {item.value}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              data-testid={`navigate-to-product-${item.label}`}
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToProduct(item.value);
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

export default SubscribeAPIProductModal;
