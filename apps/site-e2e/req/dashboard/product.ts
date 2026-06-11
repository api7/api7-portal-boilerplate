import { expect } from '@playwright/test';
import type {
  CreateProductGateway,
  ProductExternal,
  ProductGateway,
  ProductListRes,
} from '@site/types/portal-sdk';

import { HTTPBIN_URL } from '../../constant';
import { A7Ctx, a7DefaultPortalID } from './common';
import { API_PRODUCTS } from './constant';

export const httpbinRawOAS = `
openapi: 3.0.0
info:
  version: 1.0.1
  title: httpbin
servers:
  - url: ${HTTPBIN_URL}
    description: httpbin server
components:
  securitySchemes:
    basicAuth:
      type: http
      scheme: basic
security:
  - basicAuth: []
paths:
  /get:
    get:
      operationId: get
      responses:
        '200':
          description: get response
  /status/{code}:
    get:
      operationId: status
      parameters:
        - name: name
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 200 response
        '400':
          description: 400 response
  /anything/{system}/id/{id}/name/{name}:
    get:
      operationId: anything
      parameters:
        - name: name
          in: path
          required: true
          schema:
            type: string
        - name: system
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 200 response
`;

export const a7PostExternalProduct = async (
  ctx: A7Ctx,
  data?: Partial<ProductExternal>,
) => {
  const portalID = await a7DefaultPortalID(ctx);
  const postProduct = await ctx.post(`${API_PRODUCTS}?portal_id=${portalID}`, {
    data: {
      type: 'external',
      name: 'httpbin',
      raw_openapi: httpbinRawOAS,
      server_urls: [HTTPBIN_URL],
      status: 'published',
      ...data,
    },
  });

  expect(postProduct.status()).toBe(200);
  const res = (await postProduct.json()) as ObjRes<ProductExternal>;
  return res;
};

export const a7PostGatewayProduct = async (
  ctx: A7Ctx,
  data?: DeepPartial<CreateProductGateway>,
) => {
  const portalID = await a7DefaultPortalID(ctx);
  const postProduct = await ctx.post(`${API_PRODUCTS}?portal_id=${portalID}`, {
    data: {
      type: 'gateway',
      name: 'gateway',
      status: 'published',
      subscription_auto_approval: true,
      ...data,
    },
  });

  expect(postProduct.status()).toBe(200);
  return (await postProduct.json()) as ObjRes<ProductGateway>;
};

export const a7DeleteProduct = async (ctx: A7Ctx, id: string) => {
  const portalID = await a7DefaultPortalID(ctx);
  const deleteProduct = await ctx.delete(
    `${API_PRODUCTS}/${id}?portal_id=${portalID}`,
  );
  expect(deleteProduct.status()).toBe(200);
};

export const a7DeleteProductList = async (ctx: A7Ctx, ids?: string[]) => {
  const allIds = ids || [];
  if (!ids) {
    const portalID = await a7DefaultPortalID(ctx);
    const getAllProducts = await ctx.get(
      `${API_PRODUCTS}?portal_id=${portalID}`,
    );
    expect(getAllProducts.status()).toBe(200);
    const allProducts = (await getAllProducts.json()) as ProductListRes;
    allIds.push(...(allProducts.list || []).map(({ id }) => id));
  }
  return await Promise.allSettled(allIds.map((id) => a7DeleteProduct(ctx, id)));
};
