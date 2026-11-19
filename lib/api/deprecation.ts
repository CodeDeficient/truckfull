import { NextResponse } from 'next/server';

interface DeprecationMapping {
  readonly [key: string]: string;
}

interface DeprecationOptions {
  readonly newEndpoint: string;
  readonly documentation?: string;
  readonly deprecationDate?: string;
  readonly removalDate?: string;
  readonly mapping?: DeprecationMapping;
}

export function deprecatedEndpointResponse(options: DeprecationOptions) {
  const { newEndpoint, documentation, deprecationDate, removalDate } = options;
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED: This endpoint has been consolidated',
      migration: {
        message: 'Please use the new endpoint instead',
        newEndpoint,
        ...(documentation != undefined && documentation !== '' ? { documentation } : {}),
        ...(deprecationDate != undefined && deprecationDate !== '' ? { deprecationDate } : {}),
        ...(removalDate != undefined && removalDate !== '' ? { removalDate } : {}),
        ...(options.mapping == undefined ? {} : { mapping: options.mapping }),
      },
    },
    { status: 410 },
  );
}

export function deprecatedStatusResponse(options: DeprecationOptions) {
  const { newEndpoint, documentation, deprecationDate, removalDate } = options;
  return NextResponse.json(
    {
      status: 'DEPRECATED',
      message: 'This endpoint has been consolidated',
      migration: {
        newEndpoint,
        ...(documentation != undefined && documentation !== '' ? { documentation } : {}),
        ...(deprecationDate != undefined && deprecationDate !== '' ? { deprecationDate } : {}),
        ...(removalDate != undefined && removalDate !== '' ? { removalDate } : {}),
      },
    },
    { status: 410 },
  );
}
