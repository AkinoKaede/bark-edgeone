import type { CommonResp } from '../types/common';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create a success response
 */
export function success(): CommonResp {
  return {
    code: 200,
    message: 'success',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Create a failed response
 */
export function failed(code: number, message: string): CommonResp {
  return {
    code,
    message,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Create a data response
 */
export function data(responseData: any): CommonResp {
  return {
    code: 200,
    message: 'success',
    data: responseData,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Convert CommonResp to JSON Response
 */
export function jsonResponse(resp: CommonResp, status?: number): Response {
  return new Response(JSON.stringify(resp), {
    status: status || resp.code,
    headers: {
      'content-type': 'application/json',
      'x-powered-by': 'Bark-EdgeOne',
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(code: number, message: string): Response {
  return jsonResponse(failed(code, message), code);
}
