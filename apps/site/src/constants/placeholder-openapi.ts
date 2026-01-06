export const placeholderOpenAPI = `
openapi: 3.0.0
info:
  version: 1.0.1
  title: httpbin
servers:
- url: http://httpbin.org/
  description: httpbin server
paths:
  "/get":
    get:
      operationId: get
      responses:
        '200':
          description: get response
  "/status/{code}":
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
  "/anything/{system}/id/{id}/name/{name}":
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
