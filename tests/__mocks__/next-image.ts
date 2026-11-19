import React from 'react';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';

const MockImage = (props: any) => {
  const { src, alt, fill, className, ...rest } = props;
  return React.createElement('img', {
    src: src || TRUCK_FALLBACK_IMAGE,
    alt,
    'data-fill': fill ? 'true' : 'false',
    className,
    ...rest,
  });
};

MockImage.displayName = 'MockImage';
export default MockImage;
